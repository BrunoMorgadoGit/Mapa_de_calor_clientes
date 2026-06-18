import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CnaesService } from "./cnaes.service";
import { CreateCnaeDto } from "./dto/create-cnae.dto";
import { UpdateCnaeDto } from "./dto/update-cnae.dto";

@Controller("cnaes")
export class CnaesController {
  constructor(private readonly cnaesService: CnaesService) {}

  @Get()
  findAll() {
    return this.cnaesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateCnaeDto) {
    return this.cnaesService.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateCnaeDto) {
    return this.cnaesService.update(id, dto);
  }
}
