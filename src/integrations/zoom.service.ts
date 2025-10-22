import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';

interface CreateZoomMeetingParams {
  topic: string;
  startTime: string;
  durationMinutes: number;
  timezone: string;
  agenda?: string;
}

@Injectable()
export class ZoomService {
  private readonly accountId = process.env.ZOOM_ACCOUNT_ID;
  private readonly clientId = process.env.ZOOM_CLIENT_ID;
  private readonly clientSecret = process.env.ZOOM_CLIENT_SECRET;

  private cachedToken: string | null = null;
  private tokenExpiry = 0;

  private async getAccessToken() {
    if (!this.accountId || !this.clientId || !this.clientSecret) {
      throw new InternalServerErrorException(
        'Zoom API credentials are not configured.',
      );
    }

    const now = Date.now();
    if (this.cachedToken && now < this.tokenExpiry - 60_000) {
      return this.cachedToken;
    }

    try {
      const tokenResponse = await axios.post(
        `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${this.accountId}`,
        null,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${this.clientId}:${this.clientSecret}`,
            ).toString('base64')}`,
          },
        },
      );

      this.cachedToken = tokenResponse.data.access_token;
      this.tokenExpiry = now + tokenResponse.data.expires_in * 1000;

      return this.cachedToken;
    } catch (error) {
      const message =
        axios.isAxiosError(error) && error.response
          ? `Zoom token request failed: ${error.response.status} ${JSON.stringify(
            error.response.data,
          )}`
          : 'Unable to obtain Zoom access token.';
      throw new InternalServerErrorException(message);
    }
  }

  async createMeeting(params: CreateZoomMeetingParams) {
    const token = await this.getAccessToken();

    try {
      const response = await axios.post(
        'https://api.zoom.us/v2/users/me/meetings',
        {
          topic: params.topic,
          type: 2,
          start_time: params.startTime,
          duration: params.durationMinutes,
          timezone: params.timezone,
          agenda: params.agenda,
          settings: {
            join_before_host: true,
            waiting_room: false,
            approval_type: 0,
            registration_type: 1,
            mute_upon_entry: true,
            participant_video: false,
            host_video: true,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      const message =
        axios.isAxiosError(error) && error.response
          ? `Zoom meeting creation failed: ${error.response.status} ${JSON.stringify(
            error.response.data,
          )}`
          : 'Unable to create Zoom meeting.';
      throw new InternalServerErrorException(message);
    }
  }
}
