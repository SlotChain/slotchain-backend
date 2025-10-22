import { IsNotEmpty, IsString } from 'class-validator';

export class RequestNonceDto {
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @IsString()
  @IsNotEmpty()
  tokenId: string;
}

