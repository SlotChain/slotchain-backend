import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import {
  UserAvailability,
  UserAvailabilitySchema,
} from './schemas/availability.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserAvailability.name, schema: UserAvailabilitySchema },
    ]),
  ],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
})
export class AvailabilityModule {}
