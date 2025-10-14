import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class AvailabilityRange extends Document {
  @Prop({ required: true, index: true })
  walletAddress: string;

  @Prop({ required: true })
  startDate: string; // "YYYY-MM-DD"

  @Prop()
  endDate?: string; // Optional

  @Prop({ default: false })
  infinite: boolean;
}

export const AvailabilityRangeSchema =
  SchemaFactory.createForClass(AvailabilityRange);
