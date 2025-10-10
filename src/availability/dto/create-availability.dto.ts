import { IsBoolean, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class TimeSlotDto {
  @IsString()
  start: string;

  @IsString()
  end: string;
}

class DayAvailabilityDto {
  @IsBoolean()
  enabled: boolean;

  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  slots: TimeSlotDto[];
}

export class CreateAvailabilityDto {
  @IsString()
  timezone: string;

  @ValidateNested()
  @Type(() => DayAvailabilityDto)
  monday: DayAvailabilityDto;

  @ValidateNested()
  @Type(() => DayAvailabilityDto)
  tuesday: DayAvailabilityDto;

  @ValidateNested()
  @Type(() => DayAvailabilityDto)
  wednesday: DayAvailabilityDto;

  @ValidateNested()
  @Type(() => DayAvailabilityDto)
  thursday: DayAvailabilityDto;

  @ValidateNested()
  @Type(() => DayAvailabilityDto)
  friday: DayAvailabilityDto;

  @ValidateNested()
  @Type(() => DayAvailabilityDto)
  saturday: DayAvailabilityDto;

  @ValidateNested()
  @Type(() => DayAvailabilityDto)
  sunday: DayAvailabilityDto;
}
