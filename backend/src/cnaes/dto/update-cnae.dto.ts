import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateCnaeDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  isTarget?: boolean;
}
