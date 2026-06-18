import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCityDto } from "./dto/create-city.dto";
import { UpdateCityDto } from "./dto/update-city.dto";

@Injectable()
export class CitiesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.city.findMany({ orderBy: [{ uf: "asc" }, { name: "asc" }] });
  }

  create(dto: CreateCityDto) {
    return this.prisma.city.create({
      data: { ...dto, uf: dto.uf.toUpperCase() },
    });
  }

  update(id: string, dto: UpdateCityDto) {
    return this.prisma.city.update({
      where: { id },
      data: { ...dto, uf: dto.uf?.toUpperCase() },
    });
  }
}
