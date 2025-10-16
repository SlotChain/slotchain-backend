import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Get,
  Param,
  NotFoundException,
  Logger,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { AuthService } from './auth.service';
import { AvailabilityService } from '../availability/availability.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  // Step 1: Get login message
  @Post('login-message')
  getLoginMessage() {
    return this.authService.getMessageToSign();
  }

  // Step 2: Verify login (existing vs new user)
  @Post('login')
  async login(@Body() body: { walletAddress: string; signature: string }) {
    return this.authService.verifyLogin(body.walletAddress, body.signature);
  }

  @Post('signup')
  @UseInterceptors(FileInterceptor('profilePhoto'))
  async signup(
    @UploadedFile() profilePhoto: Express.Multer.File,
    @Body() body: any,
  ) {
    console.log('Received signup request');
    console.debug(`Body: ${JSON.stringify(body, null, 2)}`);
    console.log(
      `File received: ${profilePhoto ? profilePhoto.originalname : 'none'}`,
    );

    return this.authService.signup({
      walletAddress: body.walletAddress,
      fullName: body.fullName,
      email: body.email,
      bio: body.bio,
      hourlyRate: body.hourlyRate,
      currency: body.currency,
      profilePhoto, // ✅ pass as file
    });
  }

  // GET /auth/user/:walletAddress — fetch user by wallet address
  @Get('user/:walletAddress')
  async getUserByWallet(@Param('walletAddress') walletAddress: string) {
    const lower = walletAddress?.toLowerCase();
    const user = await this.authService.getUserByWalletAddress(lower);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // fetch availability (may be null)

    return {
      status: 'ok',
      data: {
        user,
      },
    };
  }

  @Post('user/:walletAddress')
  @UseInterceptors(FileInterceptor('profilePhoto'))
  async updateUser(
    @Param('walletAddress') walletAddress: string,
    @UploadedFile() profilePhoto: Express.Multer.File,
    @Body() body: any,
  ) {
    return this.authService.updateProfile({
      walletAddress,
      fullName: body.fullName,
      email: body.email,
      bio: body.bio,
      hourlyRate: body.hourlyRate,
      currency: body.currency,
      profilePhoto,
    });
  }

  // @Post('user/:walletAddress')
  // @UseInterceptors(FileInterceptor('profilePhoto'))
  // async updateUser(
  //   @Param('walletAddress') walletAddress: string,
  //   @UploadedFile() profilePhoto: Express.Multer.File,
  //   @Body() body: any,
  // ) {
  //   // Convert uploaded profile photo to base64 if present
  //   const profilePhotoBase64 = profilePhoto
  //     ? `data:${profilePhoto.mimetype};base64,${profilePhoto.buffer.toString('base64')}`
  //     : undefined;

  //   // Build update payload conditionally
  //   const updateData = {
  //     ...(body.fullName !== undefined && { fullName: body.fullName }),
  //     ...(body.email !== undefined && { email: body.email }),
  //     ...(body.bio !== undefined && { bio: body.bio }),
  //     ...(body.hourlyRate !== undefined && { hourlyRate: body.hourlyRate }),
  //     ...(body.currency !== undefined && { currency: body.currency }),
  //     ...(body.walletAddress !== undefined && {
  //       walletAddress: body.walletAddress.toLowerCase(),
  //     }),
  //     ...(profilePhotoBase64 && { profilePhoto: profilePhotoBase64 }),
  //   };

  //   // Update user document in MongoDB
  //   const updated = await this.authService.updateUserByWalletAddress(
  //     walletAddress?.toLowerCase(),
  //     updateData,
  //   );

  //   if (!updated) {
  //     throw new NotFoundException('User not found');
  //   }

  //   return { status: 'updated', user: updated };
  // }
}
