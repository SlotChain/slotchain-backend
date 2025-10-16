import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ethers } from 'ethers';
import { User } from './user.schema';
import * as dotenv from 'dotenv';
import axios from 'axios';
import FormData from 'form-data';

dotenv.config(); // ✅ load .env at runtime

@Injectable()
export class AuthService {
  private readonly LOGIN_MESSAGE =
    'Welcome to SlotChain! Sign this message to verify your wallet.';

  // ✅ Directly load env vars
  private readonly pinataApiKey = process.env.PINATA_API_KEY;
  private readonly pinataSecretKey = process.env.PINATA_SECRET_KEY;

  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

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
        data.profilePhoto.originalname,
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
          },
        );
        imageCID = pinataFileRes.data.IpfsHash;
        console.log(`🖼️ New image uploaded to IPFS: ${imageCID}`);
      } catch (err) {
        console.error(
          'Failed to upload new profile photo:',
          err.response?.data || err.message,
        );
        throw new BadRequestException(
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
        },
      );

      metadataCID = pinataJsonRes.data.IpfsHash;
      console.log(`📦 Updated metadata uploaded: ${metadataCID}`);
    } catch (err) {
      console.error(
        'Failed to upload updated metadata:',
        err.response?.data || err.message,
      );
      throw new BadRequestException(
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
      fileData.append('file', data.profilePhoto.buffer, {
        filename: data.profilePhoto.originalname,
        contentType: data.profilePhoto.mimetype,
      });

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
          },
        );

        imageCID = pinataFileRes.data.IpfsHash;
        console.log(`✅ Image uploaded: ${imageCID}`);
      } catch (err) {
        console.error(
          '❌ Failed to upload image to Pinata',
          err.response?.data || err.message,
        );
        throw new BadRequestException(
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
        },
      );

      metadataCID = pinataJsonRes.data.IpfsHash;
      console.log(` Metadata uploaded: ${metadataCID}`);
    } catch (err) {
      console.error(
        ' Failed to upload metadata',
        err.response?.data || err.message,
      );
      throw new BadRequestException('Failed to upload metadata to Pinata');
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
