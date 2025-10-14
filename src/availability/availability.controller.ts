import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post(':walletAddress')
  async saveAvailability(
    @Param('walletAddress') walletAddress: string,
    @Body() dto: CreateAvailabilityDto,
  ) {
    const result = await this.availabilityService.upsertAvailability(
      walletAddress,
      dto,
    );
    return { success: true, data: result };
  }

  @Get('getAvailability/:walletAddress')
  async getAvailability(@Param('walletAddress') walletAddress: string) {
    const result =
      await this.availabilityService.getAvailability(walletAddress);
    return { success: true, data: result };
  }
}
