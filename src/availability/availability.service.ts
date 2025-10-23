import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import moment from 'moment-timezone';
import { AxiosError } from 'axios';
import { IAvailability } from './schemas/availability.schema';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { User } from '../auth/user.schema';
import { ZoomService } from '../integrations/zoom.service';
import { EmailService } from '../notifications/email.service';
import { Booking } from './schemas/booking.schema';

interface BookSlotParams {
  creatorAddress: string;
  date: string;
  slotId: string;
  buyerEmail: string;
  buyerName?: string;
  creatorName?: string;
  tokenId: string;
}

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(
    @InjectModel('Availability')
    private readonly availabilityModel: Model<IAvailability>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<Booking>,
    private readonly zoomService: ZoomService,
    private readonly emailService: EmailService,
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

    return slots;
  }

  async bookSlot({
    creatorAddress,
    date,
    slotId,
    buyerEmail,
    buyerName,
    creatorName,
    tokenId,
  }: BookSlotParams) {
    if (!buyerEmail) {
      throw new BadRequestException('Buyer email is required.');
    }
    if (!tokenId) {
      throw new BadRequestException('tokenId is required to finalize booking.');
    }

    const normalizedCreator = creatorAddress.toLowerCase();
    const availability = await this.availabilityModel.findOne({
      walletAddress: normalizedCreator,
    });

    if (!availability) {
      throw new NotFoundException('Availability not found for creator.');
    }

    const day = availability.availableDays?.find((d) => d.date === date);
    if (!day) {
      throw new NotFoundException('Selected day not available.');
    }

    const slot = day.slots.find((s) => String(s._id) === String(slotId));
    if (!slot) {
      throw new NotFoundException('Selected slot not found.');
    }

    if (slot.booked) {
      throw new BadRequestException('Slot is already booked.');
    }

    const timezone = availability.timezone || 'UTC';
    const slotStart = moment.tz(
      `${date} ${slot.start}`,
      'YYYY-MM-DD HH:mm',
      timezone,
    );
    const slotEnd = moment.tz(
      `${date} ${slot.end}`,
      'YYYY-MM-DD HH:mm',
      timezone,
    );

    if (!slotStart.isValid() || !slotEnd.isValid()) {
      throw new BadRequestException('Slot timings are invalid.');
    }

    const durationMinutes = Math.max(
      1,
      slotEnd.diff(slotStart, 'minutes') || availability.interval || 30,
    );

    const creator = await this.userModel.findOne({
      walletAddress: normalizedCreator,
    });
    const creatorEmail = creator?.email;

    if (!creatorEmail) {
      throw new BadRequestException(
        'Creator email is not configured. Please update profile before booking.',
      );
    }

    const displayCreatorName =
      creatorName || creator?.fullName || normalizedCreator;

    slot.booked = true;
    this.logger.log(
      `[bookSlot] Attempting booking for creator=${normalizedCreator} slot=${slotId} date=${date} buyer=${buyerEmail}`,
    );

    try {
      const existingBooking = await this.bookingModel
        .findOne({ tokenId: tokenId.toString() })
        .lean();
      if (existingBooking) {
        throw new BadRequestException(
          `Booking already recorded for tokenId ${tokenId}`,
        );
      }

      await availability.save();

      const zoomMeeting = await this.zoomService.createMeeting({
        topic: `SlotChain Session with ${displayCreatorName}`,
        startTime: slotStart.format('YYYY-MM-DDTHH:mm:ss'),
        durationMinutes,
        timezone,
        agenda: `Consultation between ${
          displayCreatorName || 'the creator'
        } and ${buyerName || 'client'}`,
      });

      await this.bookingModel.create({
        creatorWalletAddress: normalizedCreator,
        creatorEmail,
        creatorName: displayCreatorName,
        userEmail: buyerEmail,
        buyerName,
        slotId: String(slot._id || slotId),
        date,
        zoomMeetingId: zoomMeeting.id,
        zoomJoinUrl: zoomMeeting.join_url,
        zoomStartUrl: zoomMeeting.start_url,
        meetingStartTime: slotStart.toDate(),
        meetingEndTime: slotEnd.toDate(),
        tokenId: tokenId.toString(),
      });

      await this.emailService.sendBookingEmails({
        buyerEmail,
        creatorEmail,
        creatorName: displayCreatorName,
        buyerName,
        joinUrl: zoomMeeting.join_url,
        startUrl: zoomMeeting.start_url,
        startTimeIso: slotStart.toISOString(),
        endTimeIso: slotEnd.toISOString(),
        timezone,
      });

      return {
        slot: {
          _id: String(slot._id || slotId),
          start: slot.start,
          end: slot.end,
          booked: slot.booked,
        },
        zoomMeeting: {
          id: zoomMeeting.id,
          joinUrl: zoomMeeting.join_url,
          startUrl: zoomMeeting.start_url,
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          timezone,
        },
      };
    } catch (error) {
      slot.booked = false;
      await availability.save();
      const axiosError = error as AxiosError;
      const responseStatus = axiosError?.response?.status;
      const responseData = axiosError?.response?.data;
      const requestConfig = axiosError?.config;
      this.logger.error(
        `[bookSlot] Failed booking details creator=${normalizedCreator} slot=${slotId} date=${date} buyer=${buyerEmail}`,
      );
      if (responseStatus) {
        this.logger.error(
          `[bookSlot] Zoom response status=${responseStatus} data=${JSON.stringify(
            responseData,
          )}`,
        );
      }
      if (requestConfig) {
        this.logger.error(
          `[bookSlot] Zoom request url=${requestConfig.url} method=${requestConfig.method}`,
        );
      }
      if (error instanceof Error) {
        this.logger.error(`[bookSlot] Error stack: ${error.stack}`);
      }
      this.logger.error(
        `Failed to finalize booking for creator ${normalizedCreator}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      throw error;
    }
  }
}
