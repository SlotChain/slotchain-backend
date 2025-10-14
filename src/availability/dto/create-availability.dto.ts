import {
  IsBoolean,
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

/** ────────────── Time Slot DTO ────────────── **/
class TimeSlotDto {
  @IsString()
  start: string;

  @IsString()
  end: string;
}

/** ────────────── Weekly Availability ────────────── **/
class WeekAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  monday: TimeSlotDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  tuesday: TimeSlotDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  wednesday: TimeSlotDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  thursday: TimeSlotDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  friday: TimeSlotDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  saturday: TimeSlotDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  sunday: TimeSlotDto[];
}

/** ────────────── Range (start–end–infinite) ────────────── **/
class RangeDto {
  @IsOptional()
  @IsString()
  start?: string;

  @IsOptional()
  @IsString()
  end?: string;

  @IsOptional()
  @IsBoolean()
  infinite?: boolean;
}

/** ────────────── Per-day Availability ────────────── **/
class AvailableDayDto {
  @IsString()
  date: string;

  @IsObject()
  @ValidateNested()
  @Type(() => WeekAvailabilityDto)
  availability: WeekAvailabilityDto;
}

/** ────────────── Main CreateAvailabilityDto ────────────── **/
export class CreateAvailabilityDto {
  @IsString()
  timezone: string;

  @IsInt()
  interval: number;

  @ValidateNested()
  @Type(() => RangeDto)
  range: RangeDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RangeDto)
  unavailableRanges: RangeDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailableDayDto)
  availableDays: AvailableDayDto[];
}
