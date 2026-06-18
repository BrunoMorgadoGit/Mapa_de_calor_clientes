import { IsBoolean, IsOptional, IsString } from "class-validator";

export class CreateCnaeDto {
  @IsString()
  code!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  isTarget?: boolean;
}
