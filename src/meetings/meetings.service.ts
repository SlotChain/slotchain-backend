import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { Booking } from '../availability/schemas/booking.schema';
import { ethers } from 'ethers';

const SLOTCHAIN_ABI = [
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function bookings(uint256 tokenId) view returns (address creator,uint256 startsAt,uint256 expiresAt,uint256 amount)',
  'function isActive(uint256 tokenId) view returns (bool)',
];

interface NonceEntry {
  nonce: string;
  expiresAt: number;
}

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);
  private readonly provider: ethers.JsonRpcProvider;
  private readonly contract: ethers.Contract;
  private readonly nonceStore = new Map<string, NonceEntry>();
  private readonly nonceTtlMs = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<Booking>,
    private readonly configService: ConfigService,
  ) {
    const rpcUrl = this.configService.get<string>('CHAIN_RPC_URL');
    const contractAddress = this.configService.get<string>(
      'SLOTCHAIN_CONTRACT_ADDRESS',
    );

    if (!rpcUrl || !contractAddress) {
      throw new Error(
        'CHAIN_RPC_URL and SLOTCHAIN_CONTRACT_ADDRESS must be configured.',
      );
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contract = new ethers.Contract(
      contractAddress,
      SLOTCHAIN_ABI,
      this.provider,
    );
  }

  private buildKey(walletAddress: string, tokenId: string) {
    return `${walletAddress.toLowerCase()}:${tokenId}`;
  }

  private purgeExpiredNonces() {
    const now = Date.now();
    for (const [key, entry] of this.nonceStore.entries()) {
      if (entry.expiresAt <= now) {
        this.nonceStore.delete(key);
      }
    }
  }

  async generateNonce(walletAddress: string, tokenId: string) {
    if (!walletAddress || !tokenId) {
      throw new BadRequestException('walletAddress and tokenId are required.');
    }

    const booking = await this.bookingModel
      .findOne({ tokenId: tokenId.toString() })
      .lean();
    if (!booking) {
      throw new NotFoundException('Booking not found for the provided token.');
    }

    const now = new Date();
    if (
      booking.meetingEndTime &&
      booking.meetingEndTime.getTime() < now.getTime()
    ) {
      throw new UnauthorizedException('Meeting has already ended.');
    }

    const normalizedAddress = walletAddress.toLowerCase();

    const nonce = randomBytes(32).toString('hex');
    this.nonceStore.set(this.buildKey(normalizedAddress, tokenId), {
      nonce,
      expiresAt: Date.now() + this.nonceTtlMs,
    });
    this.purgeExpiredNonces();

    return { nonce };
  }

  async getMeetingAccess(
    walletAddress: string,
    tokenId: string,
    signature: string,
  ) {
    if (!walletAddress || !tokenId || !signature) {
      throw new BadRequestException(
        'walletAddress, tokenId and signature are required.',
      );
    }

    const normalizedAddress = walletAddress.toLowerCase();
    const key = this.buildKey(normalizedAddress, tokenId);
    const nonceEntry = this.nonceStore.get(key);

    if (!nonceEntry) {
      throw new UnauthorizedException(
        'Verification nonce not found or expired.',
      );
    }

    if (nonceEntry.expiresAt <= Date.now()) {
      this.nonceStore.delete(key);
      throw new UnauthorizedException('Verification nonce expired.');
    }

    const recoveredAddress = ethers.verifyMessage(nonceEntry.nonce, signature);

    if (recoveredAddress.toLowerCase() !== normalizedAddress) {
      throw new UnauthorizedException(
        'Signature does not match wallet address.',
      );
    }

    this.nonceStore.delete(key);

    const booking = await this.bookingModel
      .findOne({ tokenId: tokenId.toString() })
      .lean();
    if (!booking) {
      throw new NotFoundException('Booking not found for the provided token.');
    }

    if (!booking.zoomJoinUrl) {
      throw new NotFoundException(
        'Zoom join URL is not configured for this booking.',
      );
    }

    const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
    let ownerAddress: string;
    let expiresAt: bigint;
    let tokenIdBigInt: bigint;

    try {
      tokenIdBigInt = BigInt(tokenId);
    } catch (error) {
      throw new BadRequestException('tokenId must be a valid integer string.');
    }

    try {
      ownerAddress = await this.contract.ownerOf(tokenId);
    } catch (error) {
      this.logger.warn(
        `ownerOf failed for tokenId ${tokenId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      throw new UnauthorizedException('Booking token is not active on-chain.');
    }

    if (ownerAddress.toLowerCase() !== normalizedAddress) {
      throw new UnauthorizedException(
        'Wallet does not own this booking token.',
      );
    }

    try {
      const bookingOnChain = await this.contract.bookings(tokenIdBigInt);
      expiresAt = BigInt(bookingOnChain.expiresAt ?? 0);
    } catch (error) {
      this.logger.warn(
        `bookings lookup failed for tokenId ${tokenId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      throw new UnauthorizedException(
        'Unable to verify booking status on-chain.',
      );
    }

    if (expiresAt === BigInt(0) || expiresAt <= nowSeconds) {
      throw new UnauthorizedException('Booking token has expired.');
    }

    return {
      joinUrl: booking.zoomJoinUrl,
      meetingStartTime: booking.meetingStartTime,
      meetingEndTime: booking.meetingEndTime,
      zoomMeetingId: booking.zoomMeetingId,
    };
  }
}
