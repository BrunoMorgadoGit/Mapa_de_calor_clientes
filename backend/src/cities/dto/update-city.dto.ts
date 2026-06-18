import { IsBoolean, IsOptional, IsString, Length } from "class-validator";

export class UpdateCityDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  uf?: string;

  @IsOptional()
  @IsString()
  ibgeCode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
