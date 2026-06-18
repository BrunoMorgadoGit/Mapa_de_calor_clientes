import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ImportStatus } from "@prisma/client";
import { CompaniesService } from "../companies/companies.service";
import { LeadsService } from "../leads/leads.service";
import { PrismaService } from "../prisma/prisma.service";
import { ImportCnpjDto } from "./dto/import-cnpj.dto";
import { CNPJ_PROVIDER, CnpjProvider } from "./providers/cnpj-provider.interface";

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companiesService: CompaniesService,
    private readonly leadsService: LeadsService,
    @Inject(CNPJ_PROVIDER) private readonly cnpjProvider: CnpjProvider,
  ) {}

  findAll() {
    return this.prisma.importJob.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  }

  async findById(id: string) {
    const job = await this.prisma.importJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("Importação não encontrada");
    return job;
  }

  async importCnpj(dto: ImportCnpjDto) {
    const job = await this.prisma.importJob.create({
      data: {
        uf: dto.uf.toUpperCase(),
        cityName: dto.cityName,
        cityIbgeCode: dto.cityIbgeCode,
        cnaeCode: dto.cnaeCode.replace(/\D/g, ""),
        status: ImportStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    try {
      const companies = await this.cnpjProvider.searchCompaniesByCityAndCnae({
        uf: dto.uf.toUpperCase(),
        cityName: dto.cityName,
        cityIbgeCode: dto.cityIbgeCode,
        cnaeCode: dto.cnaeCode,
        limit: dto.limit,
      });

      let totalSaved = 0;
      const savedCompanies = [];

      for (const companyData of companies) {
        const company = await this.companiesService.upsertCompany({
          ...companyData,
          uf: dto.uf.toUpperCase(),
          cidade: companyData.cidade || dto.cityName,
          cnaePrincipal: companyData.cnaePrincipal || dto.cnaeCode,
          cnaes: companyData.cnaes?.length ? companyData.cnaes : [dto.cnaeCode],
        });
        await this.leadsService.upsertLeadForCompany(company.id);
        totalSaved += 1;
        savedCompanies.push(company);
      }

      const updatedJob = await this.prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: ImportStatus.SUCCESS,
          totalFound: companies.length,
          totalSaved,
          finishedAt: new Date(),
        },
      });

      return { job: updatedJob, companies: savedCompanies };
    } catch (error) {
      const updatedJob = await this.prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: ImportStatus.ERROR,
          errorMessage: error instanceof Error ? error.message : "Erro desconhecido",
          finishedAt: new Date(),
        },
      });
      return { job: updatedJob, companies: [] };
    }
  }
}
