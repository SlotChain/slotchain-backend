import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserAvailability } from './schemas/availability.schema';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(UserAvailability.name)
    private readonly availabilityModel: Model<UserAvailability>,
  ) {}

  async upsertAvailability(walletAddress: string, dto: CreateAvailabilityDto) {
    return this.availabilityModel.findOneAndUpdate(
      { walletAddress },
      { walletAddress, ...dto },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  async getAvailability(walletAddress: string) {
    return this.availabilityModel.findOne({ walletAddress });
  }
}
