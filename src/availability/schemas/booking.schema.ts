import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Booking extends Document {
  @Prop({ required: true, index: true })
  creatorWalletAddress: string;

  @Prop({ required: true })
  creatorEmail: string;

  @Prop()
  creatorName?: string;

  @Prop({ required: true })
  userEmail: string;

  @Prop()
  buyerName?: string;

  @Prop({ required: true })
  slotId: string;

  @Prop({ required: true })
  date: string;

  @Prop()
  zoomMeetingId?: string;

  @Prop()
  zoomJoinUrl?: string;

  @Prop()
  zoomStartUrl?: string;

  @Prop()
  meetingStartTime?: Date;

  @Prop()
  meetingEndTime?: Date;

  @Prop({ required: true, unique: true })
  tokenId: string;

  @Prop({ default: 'confirmed' })
  status: string;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
