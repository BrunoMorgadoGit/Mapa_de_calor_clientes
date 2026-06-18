import { IsOptional, IsString } from "class-validator";

export class CompanyQueryDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  uf?: string;

  @IsOptional()
  @IsString()
  cnae?: string;

  @IsOptional()
  @IsString()
  situacaoCadastral?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
