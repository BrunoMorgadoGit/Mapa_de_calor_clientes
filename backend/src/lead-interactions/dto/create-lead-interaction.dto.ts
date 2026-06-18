import { IsString } from "class-validator";

export class CreateLeadInteractionDto {
  @IsString()
  userId!: string;

  @IsString()
  type!: string;

  @IsString()
  description!: string;
}
