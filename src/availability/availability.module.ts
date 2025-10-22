import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import { AvailabilitySchema } from './schemas/availability.schema';

import {
  UserAvailability,
  UserAvailabilitySchema,
} from './schemas/user-availability.schema';

import {
  AvailabilityRange,
  AvailabilityRangeSchema,
} from './schemas/availability-range.schema';

import {
  UnavailableDate,
  UnavailableDateSchema,
} from './schemas/unavailable-date.schema';

import { User, UserSchema } from '../auth/user.schema';
import { ZoomService } from '../integrations/zoom.service';
import { EmailService } from '../notifications/email.service';
import { Booking, BookingSchema } from './schemas/booking.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Availability', schema: AvailabilitySchema },
      { name: UserAvailability.name, schema: UserAvailabilitySchema },
      { name: AvailabilityRange.name, schema: AvailabilityRangeSchema },
      { name: UnavailableDate.name, schema: UnavailableDateSchema },
      { name: User.name, schema: UserSchema },
      { name: Booking.name, schema: BookingSchema },
    ]),
  ],
  controllers: [AvailabilityController],
  providers: [AvailabilityService, ZoomService, EmailService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
