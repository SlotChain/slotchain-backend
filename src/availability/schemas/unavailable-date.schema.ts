import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class UnavailableDate extends Document {
  @Prop({ required: true, index: true })
  walletAddress: string;

  @Prop({ required: true })
  date: string; // "YYYY-MM-DD"
}

export const UnavailableDateSchema =
  SchemaFactory.createForClass(UnavailableDate);
