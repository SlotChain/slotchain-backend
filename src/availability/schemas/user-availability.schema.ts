import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class TimeSlot {
  @Prop({ required: true })
  start: string; // "09:00"

  @Prop({ required: true })
  end: string; // "17:00"
}

const TimeSlotSchema = SchemaFactory.createForClass(TimeSlot);

@Schema({ _id: false })
export class DayAvailability {
  @Prop({ default: false })
  enabled: boolean;

  @Prop({ type: [TimeSlotSchema], default: [] })
  slots: TimeSlot[];
}

const DayAvailabilitySchema = SchemaFactory.createForClass(DayAvailability);

@Schema({ timestamps: true })
export class UserAvailability extends Document {
  @Prop({ required: true, index: true })
  walletAddress: string;

  @Prop({ required: true, default: 'UTC' })
  timezone: string;

  @Prop({ required: true, default: 30 })
  slotIntervalMinutes: number;

  @Prop({ type: DayAvailabilitySchema, default: {} })
  sunday: DayAvailability;

  @Prop({ type: DayAvailabilitySchema, default: {} })
  monday: DayAvailability;

  @Prop({ type: DayAvailabilitySchema, default: {} })
  tuesday: DayAvailability;

  @Prop({ type: DayAvailabilitySchema, default: {} })
  wednesday: DayAvailability;

  @Prop({ type: DayAvailabilitySchema, default: {} })
  thursday: DayAvailability;

  @Prop({ type: DayAvailabilitySchema, default: {} })
  friday: DayAvailability;

  @Prop({ type: DayAvailabilitySchema, default: {} })
  saturday: DayAvailability;
}

export const UserAvailabilitySchema =
  SchemaFactory.createForClass(UserAvailability);
