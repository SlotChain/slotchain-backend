import { Body, Controller, Post } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { RequestNonceDto } from './dto/request-nonce.dto';
import { AccessMeetingDto } from './dto/access-meeting.dto';

@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post('nonce')
  async requestNonce(@Body() body: RequestNonceDto) {
    const { walletAddress, tokenId } = body;
    return this.meetingsService.generateNonce(walletAddress, tokenId);
  }

  @Post('access')
  async getAccess(@Body() body: AccessMeetingDto) {
    const { walletAddress, tokenId, signature } = body;
    const payload = await this.meetingsService.getMeetingAccess(
      walletAddress,
      tokenId,
      signature,
    );
    return payload;
  }
}

