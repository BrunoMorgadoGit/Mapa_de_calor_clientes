import { Module } from "@nestjs/common";
import { CNPJ_PROVIDER } from "../imports/providers/cnpj-provider.interface";
import { MockCnpjProvider } from "../imports/providers/mock-cnpj.provider";
import { CompaniesController } from "./companies.controller";
import { CompaniesService } from "./companies.service";

@Module({
  controllers: [CompaniesController],
  providers: [CompaniesService, { provide: CNPJ_PROVIDER, useClass: MockCnpjProvider }],
  exports: [CompaniesService],
})
export class CompaniesModule {}
