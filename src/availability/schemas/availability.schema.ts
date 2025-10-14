import { Schema, Document } from 'mongoose';

/* ─────────────── INTERFACES ─────────────── */

export interface ITimeSlot {
  start: string;
  end: string;
}

export interface IWeekAvailability {
  monday: ITimeSlot[];
  tuesday: ITimeSlot[];
  wednesday: ITimeSlot[];
  thursday: ITimeSlot[];
  friday: ITimeSlot[];
  saturday: ITimeSlot[];
  sunday: ITimeSlot[];
}

export interface IRange {
  start?: string;
  end?: string;
  infinite?: boolean;
}

export interface IAvailableDay {
  date: string;
  availability: IWeekAvailability;
}

export interface IAvailability extends Document {
  walletAddress: string;
  timezone: string;
  interval: number;
  range?: IRange;
  unavailableRanges?: IRange[];
  availableDays?: IAvailableDay[];
  createdAt: Date;
  updatedAt: Date;
}

/* ─────────────── SCHEMAS ─────────────── */

const TimeSlotSchema = new Schema<ITimeSlot>(
  {
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  { _id: false },
);

const WeekAvailabilitySchema = new Schema<IWeekAvailability>(
  {
    monday: [TimeSlotSchema],
    tuesday: [TimeSlotSchema],
    wednesday: [TimeSlotSchema],
    thursday: [TimeSlotSchema],
    friday: [TimeSlotSchema],
    saturday: [TimeSlotSchema],
    sunday: [TimeSlotSchema],
  },
  { _id: false },
);

const RangeSchema = new Schema<IRange>(
  {
    start: String,
    end: String,
    infinite: Boolean,
  },
  { _id: false },
);

const AvailableDaySchema = new Schema<IAvailableDay>(
  {
    date: { type: String, required: true },
    availability: { type: WeekAvailabilitySchema, required: true },
  },
  { _id: false },
);

/* ─────────────── MAIN AVAILABILITY SCHEMA ─────────────── */

export const AvailabilitySchema = new Schema<IAvailability>(
  {
    walletAddress: { type: String, index: true, required: true },
    timezone: { type: String, required: true },
    interval: { type: Number, default: 30 },
    range: RangeSchema,
    unavailableRanges: [RangeSchema],
    availableDays: [AvailableDaySchema],
  },
  { timestamps: true },
);
