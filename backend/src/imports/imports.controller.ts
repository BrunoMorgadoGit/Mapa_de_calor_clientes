import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ImportCnpjDto } from "./dto/import-cnpj.dto";
import { ImportsService } from "./imports.service";

@Controller("imports")
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post("cnpj")
  importCnpj(@Body() dto: ImportCnpjDto) {
    return this.importsService.importCnpj(dto);
  }

  @Get()
  findAll() {
    return this.importsService.findAll();
  }

  @Get(":id")
  findById(@Param("id") id: string) {
    return this.importsService.findById(id);
  }
}
