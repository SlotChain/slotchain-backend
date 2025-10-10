import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  walletAddress: string;

  @Prop()
  fullName: string;

  @Prop()
  email: string;

  @Prop()
  bio?: string;

  @Prop()
  profilePhoto?: string;

  @Prop()
  hourlyRate: string;

  @Prop()
  currency: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
