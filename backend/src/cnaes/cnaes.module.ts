import { Module } from "@nestjs/common";
import { CnaesController } from "./cnaes.controller";
import { CnaesService } from "./cnaes.service";

@Module({
  controllers: [CnaesController],
  providers: [CnaesService],
})
export class CnaesModule {}
