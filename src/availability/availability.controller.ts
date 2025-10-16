import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post('bookSlot')
  async bookSlot(
    @Body() body: { creatorAddress: string; date: string; slotId: string },
  ) {
    console.log('🔥 [POST /bookSlot] Hit the bookSlot controller');
    console.log('📦 Request body:', body);

    try {
      const result = await this.availabilityService.bookSlot(body);
      console.log('✅ Booking result:', result);
      return {
        success: true,
        message: 'Slot booked successfully',
        data: result,
      };
    } catch (error) {
      console.error('❌ Error booking slot:', error.message);
      return { success: false, message: error.message };
    }
  }

  @Post('save/:walletAddress')
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
