import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ethers } from 'ethers';
import { User } from './user.schema';

@Injectable()
export class AuthService {
  private readonly LOGIN_MESSAGE =
    'Welcome to SlotChain! Sign this message to verify your wallet.';

  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  // Step 1 — Send message to sign
  getMessageToSign() {
    return { message: this.LOGIN_MESSAGE };
  }

  // Fetch user by wallet address
  async getUserByWalletAddress(walletAddress: string) {
    if (!walletAddress) return null;

    const user = await this.userModel.findOne({
      walletAddress: walletAddress.toLowerCase(),
    });

    return user;
  }

  async updateUserByWalletAddress(walletAddress: string, update: any) {
    if (!walletAddress) return null;

    // Ensure wallet address is lowercase
    walletAddress = walletAddress.toLowerCase();

    if (update.walletAddress) {
      update.walletAddress = update.walletAddress.toLowerCase();
    }

    const updated = await this.userModel.findOneAndUpdate(
      { walletAddress },
      { $set: update },
      { new: true },
    );

    return updated;
  }

  // Step 2 — Verify wallet login
  async verifyLogin(walletAddress: string, signature: string) {
    const recovered = ethers.verifyMessage(this.LOGIN_MESSAGE, signature);

    if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new UnauthorizedException('Signature verification failed');
    }

    const user = await this.userModel.findOne({
      walletAddress: walletAddress.toLowerCase(),
    });

    if (user) {
      return { status: 'existing_user', user };
    } else {
      return { status: 'new_user' };
    }
  }

  // Step 3 — Signup new user
  async signup(data: {
    walletAddress: string;
    fullName: string;
    email: string;
    bio?: string;
    profilePhoto?: string;
    hourlyRate: string;
    currency: string;
  }) {
    if (!data.walletAddress) {
      throw new BadRequestException('Wallet address is required');
    }

    const existing = await this.userModel.findOne({
      walletAddress: data.walletAddress.toLowerCase(),
    });
    if (existing) return { status: 'existing_user', user: existing };

    const newUser = await this.userModel.create({
      walletAddress: data.walletAddress.toLowerCase(),
      fullName: data.fullName,
      email: data.email,
      bio: data.bio,
      profilePhoto: data.profilePhoto,
      hourlyRate: data.hourlyRate,
      currency: data.currency,
    });

    return { status: 'created', user: newUser };
  }
}
