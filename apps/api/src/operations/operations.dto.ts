import { ApiProperty, ApiPropertyOptional } from "../common/api-docs.decorators";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength
} from "class-validator";
import { PaginationDto } from "../common/pagination.dto";

export class AgencyQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ["open", "closed"] })
  @IsOptional()
  @IsString()
  status?: "open" | "closed";
}

export class CreateAgencyDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  code!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(240)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  zone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  parentOrgan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  cashMaxAmount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  postalValueMaxAmount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  foreignCurrencyMaxAmount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({ strict: true })
  managerManagementStartDate?: string;
}

export class CloseAgencyDto {
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
