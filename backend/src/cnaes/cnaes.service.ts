import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCnaeDto } from "./dto/create-cnae.dto";
import { UpdateCnaeDto } from "./dto/update-cnae.dto";

function normalizeCnae(code: string) {
  return code.replace(/\D/g, "");
}

@Injectable()
export class CnaesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.cnae.findMany({ orderBy: [{ isTarget: "desc" }, { code: "asc" }] });
  }

  create(dto: CreateCnaeDto) {
    return this.prisma.cnae.create({
      data: { ...dto, code: normalizeCnae(dto.code) },
    });
  }

  update(id: string, dto: UpdateCnaeDto) {
    return this.prisma.cnae.update({
      where: { id },
      data: { ...dto, code: dto.code ? normalizeCnae(dto.code) : undefined },
    });
  }
}
