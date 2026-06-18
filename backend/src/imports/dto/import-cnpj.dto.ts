import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

export class ImportCnpjDto {
  @IsString()
  @Length(2, 2)
  uf!: string;

  @IsString()
  cityName!: string;

  @IsOptional()
  @IsString()
  cityIbgeCode?: string;

  @IsString()
  cnaeCode!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  limit!: number;
}
