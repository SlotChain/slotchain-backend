import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ethers } from 'ethers';
import { User } from './user.schema';
import * as dotenv from 'dotenv';
import axios from 'axios';
import FormData from 'form-data';
import * as path from 'path';

dotenv.config(); // ✅ load .env at runtime

@Injectable()
export class AuthService {
  private readonly LOGIN_MESSAGE =
    'Welcome to SlotChain! Sign this message to verify your wallet.';

  // ✅ Directly load env vars
  private readonly pinataApiKey = process.env.PINATA_API_KEY;
  private readonly pinataSecretKey = process.env.PINATA_SECRET_KEY;

  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  private buildProfilePhotoFilename(
    walletAddress: string,
    file: Express.Multer.File,
  ) {
    const extension = this.resolveFileExtension(
      file?.originalname,
      file?.mimetype,
    );
    const normalizedWallet = walletAddress.toLowerCase();
    return `${normalizedWallet}-photo${extension}`;
  }

  private resolveFileExtension(originalName?: string, mimetype?: string) {
    const nameExt =
      (originalName && path.extname(originalName).toLowerCase()) || '';
    if (nameExt) {
      return nameExt;
    }

    switch (mimetype) {
      case 'image/jpeg':
      case 'image/jpg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/gif':
        return '.gif';
      case 'image/webp':
        return '.webp';
      case 'image/svg+xml':
        return '.svg';
      default:
        return '';
    }
  }

  private describePinataError(err: unknown) {
    if (axios.isAxiosError(err)) {
      const { response, code, message } = err;

      if (response) {
        const payload =
          typeof response.data === 'string'
            ? response.data
            : JSON.stringify(response.data);
        return `Pinata responded with status ${response.status}${
          payload ? ` - ${payload}` : ''
        }`;
      }

      if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
        return 'Unable to resolve api.pinata.cloud. Check your internet connection or DNS configuration.';
      }

      if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
        return 'Connection to Pinata timed out. Please retry shortly.';
      }

      return message || 'Unexpected Axios error occurred while contacting Pinata.';
    }

    if (err instanceof Error) {
      return err.message;
    }

    return 'Unknown error occurred while contacting Pinata.';
  }

  private buildPinataException(err: unknown, fallback: string) {
    const message = this.describePinataError(err);
    if (
      axios.isAxiosError(err) &&
      !err.response &&
      ['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ETIMEDOUT'].includes(
        String(err.code),
      )
    ) {
      return new ServiceUnavailableException(message);
    }
    return new BadRequestException(`${fallback}. ${message}`);
  }

  // Step 1 — Send message to sign
  getMessageToSign() {
    return { message: this.LOGIN_MESSAGE };
  }

  // Fetch user by wallet address
  async getUserByWalletAddress(walletAddress: string) {
    if (!walletAddress) return null;
    return this.userModel.findOne({
      walletAddress: walletAddress.toLowerCase(),
    });
  }

  async updateProfile(data: {
    walletAddress: string;
    fullName?: string;
    email?: string;
    bio?: string;
    profilePhoto?: Express.Multer.File;
    hourlyRate?: string;
    currency?: string;
  }) {
    if (!data.walletAddress) {
      throw new BadRequestException('Wallet address is required');
    }

    const wallet = data.walletAddress.toLowerCase();
    const existingUser = await this.userModel.findOne({
      walletAddress: wallet,
    });
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    let imageCID = existingUser.profilePhoto || null;
    let metadataCID = null;

    // ✅ 1. Upload new image if it was changed
    if (data.profilePhoto) {
      const fileData = new FormData();
      fileData.append(
        'file',
        data.profilePhoto.buffer,
        {
          filename: this.buildProfilePhotoFilename(wallet, data.profilePhoto),
          contentType: data.profilePhoto.mimetype,
        },
      );

      try {
        const pinataFileRes = await axios.post(
          'https://api.pinata.cloud/pinning/pinFileToIPFS',
          fileData,
          {
            headers: {
              ...fileData.getHeaders(),
              pinata_api_key: this.pinataApiKey,
              pinata_secret_api_key: this.pinataSecretKey,
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
          },
        );
        imageCID = pinataFileRes.data.IpfsHash;
        console.log(`🖼️ New image uploaded to IPFS: ${imageCID}`);
      } catch (err) {
        console.error(
          'Failed to upload new profile photo:',
          this.describePinataError(err),
        );
        throw this.buildPinataException(
          err,
          'Failed to upload new profile photo to Pinata',
        );
      }
    }

    // ✅ 2. Rebuild and upload updated metadata
    const metadata = {
      walletAddress: wallet,
      fullName: data.fullName ?? existingUser.fullName,
      email: data.email ?? existingUser.email,
      bio: data.bio ?? existingUser.bio,
      hourlyRate: data.hourlyRate ?? existingUser.hourlyRate,
      currency: data.currency ?? existingUser.currency,
      image: imageCID ? `ipfs://${imageCID}` : existingUser.profilePhoto,
      updatedAt: new Date().toISOString(),
    };

    try {
      const pinataJsonRes = await axios.post(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        {
          pinataMetadata: {
            name: `User_${wallet}_updated_${Date.now()}`,
            keyvalues: {
              type: 'userProfileUpdate',
              wallet,
            },
          },
          pinataContent: metadata,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            pinata_api_key: this.pinataApiKey,
            pinata_secret_api_key: this.pinataSecretKey,
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        },
      );

      metadataCID = pinataJsonRes.data.IpfsHash;
      console.log(`📦 Updated metadata uploaded: ${metadataCID}`);
    } catch (err) {
      console.error(
        'Failed to upload updated metadata:',
        this.describePinataError(err),
      );
      throw this.buildPinataException(
        err,
        'Failed to upload updated metadata to Pinata',
      );
    }

    // ✅ 3. Save updated user in MongoDB
    const updatedUser = await this.userModel.findOneAndUpdate(
      { walletAddress: wallet },
      {
        $set: {
          fullName: metadata.fullName,
          email: metadata.email,
          bio: metadata.bio,
          profilePhoto: metadata.image,
          hourlyRate: metadata.hourlyRate,
          currency: metadata.currency,
          imageCID,
          metadataCID,
          updatedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!updatedUser) {
      throw new NotFoundException('Failed to update user in database');
    }

    // ✅ 4. Prepare smart contract data
    const metadataURI = `ipfs://${metadataCID}`;
    const hourlyRate6Decimals = (
      Number(metadata.hourlyRate) * 1_000_000
    ).toString();

    return {
      status: 'updated',
      user: updatedUser,
      pinata: { imageCID, metadataCID, metadataURI },
      contractData: {
        hourlyRate: hourlyRate6Decimals,
        metadataURI,
      },
    };
  }

  // async updateUserByWalletAddress(walletAddress: string, update: any) {
  //   if (!walletAddress) return null;
  //   walletAddress = walletAddress.toLowerCase();

  //   if (update.walletAddress) {
  //     update.walletAddress = update.walletAddress.toLowerCase();
  //   }

  //   return this.userModel.findOneAndUpdate(
  //     { walletAddress },
  //     { $set: update },
  //     { new: true },
  //   );
  // }

  // Step 2 — Verify login
  async verifyLogin(walletAddress: string, signature: string) {
    const recovered = ethers.verifyMessage(this.LOGIN_MESSAGE, signature);

    if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new UnauthorizedException('Signature verification failed');
    }

    const user = await this.userModel.findOne({
      walletAddress: walletAddress.toLowerCase(),
    });

    return user ? { status: 'existing_user', user } : { status: 'new_user' };
  }

  // Step 3 — Signup
  async signup(data: {
    walletAddress: string;
    fullName: string;
    email: string;
    bio?: string;
    profilePhoto?: Express.Multer.File;
    hourlyRate: string;
    currency: string;
  }) {
    if (!data.walletAddress) {
      throw new BadRequestException('Wallet address is required');
    }

    // Check existing user
    const existing = await this.userModel.findOne({
      walletAddress: data.walletAddress.toLowerCase(),
    });
    if (existing) {
      console.warn(`⚠️ Existing user found: ${data.walletAddress}`);
      return { status: 'existing_user', user: existing };
    }

    let imageCID: string | null = null;
    let metadataCID: string | null = null;

    if (data.profilePhoto) {
      const fileData = new FormData();
      fileData.append(
        'file',
        data.profilePhoto.buffer,
        {
          filename: this.buildProfilePhotoFilename(
            data.walletAddress,
            data.profilePhoto,
          ),
          contentType: data.profilePhoto.mimetype,
        },
      );

      try {
        const pinataFileRes = await axios.post(
          'https://api.pinata.cloud/pinning/pinFileToIPFS',
          fileData,
      {
        headers: {
          ...fileData.getHeaders(),
          pinata_api_key: String(this.pinataApiKey),
          pinata_secret_api_key: String(this.pinataSecretKey),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      },
    );

        imageCID = pinataFileRes.data.IpfsHash;
        console.log(`✅ Image uploaded: ${imageCID}`);
      } catch (err) {
        console.error(
          '❌ Failed to upload image to Pinata',
          this.describePinataError(err),
        );
        throw this.buildPinataException(
          err,
          'Failed to upload profile photo to Pinata',
        );
      }
    }
    // Upload metadata
    const metadata = {
      walletAddress: data.walletAddress,
      fullName: data.fullName,
      email: data.email,
      bio: data.bio,
      hourlyRate: data.hourlyRate,
      currency: data.currency,
      image: imageCID ? `ipfs://${imageCID}` : null,
      createdAt: new Date().toISOString(),
    };

    try {
      const pinataJsonRes = await axios.post(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        {
          pinataMetadata: {
            name: `User_${data.walletAddress}`,
            keyvalues: {
              type: 'userProfile',
              wallet: data.walletAddress.toLowerCase(),
            },
          },
          pinataContent: metadata,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            pinata_api_key: this.pinataApiKey,
            pinata_secret_api_key: this.pinataSecretKey,
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        },
      );

      metadataCID = pinataJsonRes.data.IpfsHash;
      console.log(` Metadata uploaded: ${metadataCID}`);
    } catch (err) {
      console.error(
        ' Failed to upload metadata',
        this.describePinataError(err),
      );
      throw this.buildPinataException(err, 'Failed to upload metadata to Pinata');
    }

    // 3️⃣ Save user
    const newUser = await this.userModel.create({
      walletAddress: data.walletAddress.toLowerCase(),
      fullName: data.fullName,
      email: data.email,
      bio: data.bio,
      profilePhoto: imageCID ? `ipfs://${imageCID}` : null,
      hourlyRate: data.hourlyRate,
      currency: data.currency,
      imageCID,
      metadataCID,
    });

    // 4️⃣ Build full metadata URI and format hourly rate
    const metadataURI = `ipfs://${metadataCID}`;
    const hourlyRate6Decimals = (
      Number(data.hourlyRate) * 1_000_000
    ).toString();

    console.log(`💾 User saved to MongoDB: ${newUser._id}`);

    return {
      status: 'created',
      user: newUser,
      pinata: { imageCID, metadataCID, metadataURI },
      contractData: {
        hourlyRate: hourlyRate6Decimals,
        metadataURI,
      },
    };
  }
}
