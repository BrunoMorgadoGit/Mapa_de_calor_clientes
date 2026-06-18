import { Type } from "class-transformer";
import { IsArray, IsDate, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateCompanyDto {
  @IsString()
  cnpj!: string;

  @IsString()
  razaoSocial!: string;

  @IsOptional()
  @IsString()
  nomeFantasia?: string;

  @IsString()
  situacaoCadastral!: string;

  @IsOptional()
  @IsString()
  porte?: string;

  @IsOptional()
  @IsString()
  matrizFilial?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dataAbertura?: Date;

  @IsOptional()
  @IsString()
  cnaePrincipal?: string;

  @IsString()
  uf!: string;

  @IsString()
  cidade!: string;

  @IsOptional()
  @IsString()
  bairro?: string;

  @IsOptional()
  @IsString()
  cep?: string;

  @IsOptional()
  @IsString()
  logradouro?: string;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsString()
  complemento?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cnaes?: string[];
}
