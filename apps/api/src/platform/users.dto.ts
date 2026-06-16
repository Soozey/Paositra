import { ApiProperty, ApiPropertyOptional } from "../common/api-docs.decorators";
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength
} from "class-validator";

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  displayName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  mustChangePassword = true;

}
