import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength
} from "class-validator";
import { PaginationDto } from "../common/pagination.dto";

export class CreateInstitutionDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(240)
  name!: string;
}

export class UpdateInstitutionDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(240)
  name!: string;

  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;
}

export class PlacementQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @ApiPropertyOptional({ enum: ["open", "cancelled", "closed"] })
  @IsOptional()
  @IsString()
  status?: "open" | "cancelled" | "closed";
}

export class CreatePlacementDto {
  @ApiProperty()
  @IsUUID()
  institutionId!: string;

  @ApiProperty({ example: "1000000.00" })
  @IsNumberString()
  principalAmount!: string;

  @ApiProperty({ example: "MGA" })
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  currency!: string;

  @ApiProperty({ description: "Taux annuel exprimé en pourcentage" })
  @IsNumberString()
  annualInterestRate!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(36500)
  durationDays!: number;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  depositMode!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  interestCalculationMode!: string;

  @ApiProperty()
  @IsDateString({ strict: true })
  startDate!: string;
}

export class UpdatePlacementDto extends CreatePlacementDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;
}

export class PlacementActionDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;
}
