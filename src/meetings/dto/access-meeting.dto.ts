import { IsNotEmpty, IsString } from 'class-validator';

export class AccessMeetingDto {
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @IsString()
  @IsNotEmpty()
  tokenId: string;

  @IsString()
  @IsNotEmpty()
  signature: string;
}

