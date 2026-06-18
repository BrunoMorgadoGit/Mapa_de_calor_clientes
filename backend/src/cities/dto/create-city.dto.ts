import { IsBoolean, IsOptional, IsString, Length } from "class-validator";

export class CreateCityDto {
  @IsString()
  name!: string;

  @IsString()
  @Length(2, 2)
  uf!: string;

  @IsOptional()
  @IsString()
  ibgeCode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
