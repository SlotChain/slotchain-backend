import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class DailyAvailability extends Document {
  @Prop({ required: true })
  walletAddress: string;

  @Prop({ required: true })
  date: string; // YYYY-MM-DD

  @Prop({ required: true })
  timezone: string;

  @Prop({ type: [{ start: String, end: String }], default: [] })
  slots: { start: string; end: string }[];

  @Prop({ default: null })
  interval?: number;
}

export const DailyAvailabilitySchema =
  SchemaFactory.createForClass(DailyAvailability);
