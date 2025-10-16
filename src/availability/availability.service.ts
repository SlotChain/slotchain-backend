import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import moment from 'moment-timezone';
import { IAvailability } from './schemas/availability.schema';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

interface BookSlotParams {
  walletAddress: string;
  date: string;
  slotId: string;
}

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel('Availability')
    private readonly availabilityModel: Model<IAvailability>,
  ) {}

  /** 🔹 Upsert user availability */
  async upsertAvailability(walletAddress: string, dto: CreateAvailabilityDto) {
    const updateData = {
      walletAddress,
      timezone: dto.timezone,
      interval: dto.interval ?? 30,
      range: dto.range || {},
      unavailableRanges: dto.unavailableRanges || [],
      availableDays: dto.availableDays || [],
    };

    const result = await this.availabilityModel.findOneAndUpdate(
      { walletAddress },
      { $set: updateData },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return result;
  }

  /** 🔹 Get availability by wallet address */
  async getAvailability(walletAddress: string) {
    const availability = await this.availabilityModel.findOne({
      walletAddress,
    });
    if (!availability) {
      return null;
    }

    return availability;
  }

  /** 🔹 Compute dynamic slots for a given date */
  async getAvailableSlots(walletAddress: string, targetDate: string) {
    const availability = await this.availabilityModel.findOne({
      walletAddress,
    });
    if (!availability) return [];

    const range = availability.range;
    const isInfinite = range?.infinite;
    const startDate = range?.start;
    const endDate = range?.end;

    // Skip if outside defined range
    if (
      !isInfinite &&
      (moment(targetDate).isBefore(moment(startDate)) ||
        moment(targetDate).isAfter(moment(endDate)))
    ) {
      return [];
    }

    // Find this specific day from availableDays[]
    const dayRecord = availability.availableDays?.find(
      (d) => d.date === targetDate,
    );
    if (!dayRecord) return [];

    const weekday = moment(targetDate)
      .tz(availability.timezone)
      .format('dddd')
      .toLowerCase();

    const dayAvailability = dayRecord?.[weekday];
    if (!dayAvailability || dayAvailability.length === 0) return [];

    const interval = availability.interval;
    const slots: { start: string; end: string }[] = [];

    for (const { start, end } of dayAvailability) {
      let cursor = moment(start, 'HH:mm');
      const endTime = moment(end, 'HH:mm');

      while (cursor.clone().add(interval, 'minutes').isSameOrBefore(endTime)) {
        const slotStart = cursor.format('HH:mm');
        const slotEnd = cursor.add(interval, 'minutes').format('HH:mm');
        slots.push({ start: slotStart, end: slotEnd });
      }
    }

    console.log(`🕒 Available slots for ${targetDate}:`, slots);
    return slots;
  }

  async bookSlot({
    creatorAddress,
    date,
    slotId,
  }: {
    creatorAddress: string;
    date: string;
    slotId: string;
  }) {
    const userAvailability = await this.availabilityModel.findOne({
      walletAddress: creatorAddress,
    });

    console.log('User Availabiltiy', userAvailability);

    if (!userAvailability) {
      throw new Error('Availability not found');
    }

    const day = userAvailability?.availableDays?.find((d) => d.date === date);
    if (!day) {
      throw new Error('Day not found');
    }

    const slot = day.slots.find((s) => String(s._id) === String(slotId));
    if (!slot) {
      throw new Error('Slot not found');
    }

    if (slot.booked) {
      throw new Error('Slot is already booked');
    }

    slot.booked = true;

    await userAvailability.save();

    return slot;
  }
}
