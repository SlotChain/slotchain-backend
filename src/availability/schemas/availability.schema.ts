import mongoose, { Schema, Document } from 'mongoose';

/* ─────────────── INTERFACES ─────────────── */

export interface ITimeSlot {
  _id?: string | mongoose.Types.ObjectId; // ✅ add this
  start: string;
  end: string;
  booked: boolean;
}

export interface IRange {
  start?: string;
  end?: string;
  infinite?: boolean;
}

export interface IAvailableDay {
  date: string;
  slots: ITimeSlot[];
  slotId?: string; // <-- optional id for booking
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

const TimeSlotSchema = new Schema<ITimeSlot>(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      auto: true, // Let Mongo handle _id generation
    },
    start: { type: String, required: true },
    end: { type: String, required: true },
    booked: { type: Boolean, default: false },
  },
  { _id: true }, // Keep _id (default behavior)
);

const RangeSchema = new Schema<IRange>(
  {
    start: { type: String },
    end: { type: String },
    infinite: { type: Boolean, default: false },
  },
  { _id: false },
);

const AvailableDaySchema = new Schema<IAvailableDay>(
  {
    date: { type: String, required: true },
    slots: { type: [TimeSlotSchema], default: [] },
  },
  { _id: false },
);

export const AvailabilitySchema = new Schema<IAvailability>(
  {
    walletAddress: { type: String, index: true, required: true }, // ✅ replaced creatorAddress
    timezone: { type: String, required: true },
    interval: { type: Number, default: 30 },
    range: { type: RangeSchema },
    unavailableRanges: { type: [RangeSchema], default: [] },
    availableDays: { type: [AvailableDaySchema], default: [] },
  },
  { timestamps: true },
);
