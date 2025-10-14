import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User, UserSchema } from './user.schema';
import { AvailabilityModule } from '../availability/availability.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    AvailabilityModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
