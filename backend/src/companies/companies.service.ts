import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { normalizeCnpj } from "../common/cnpj";
import { CNPJ_PROVIDER, CnpjProvider, ExternalCompany } from "../imports/providers/cnpj-provider.interface";
import { PrismaService } from "../prisma/prisma.service";
import { CompanyQueryDto } from "./dto/company-query.dto";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";

function normalizeCnae(code?: string | null) {
  return code?.replace(/\D/g, "") || undefined;
}

const safeAssignedToSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CNPJ_PROVIDER) private readonly cnpjProvider: CnpjProvider,
  ) {}

  findAll(query: CompanyQueryDto) {
    const where: Prisma.CompanyWhereInput = {};
    const and: Prisma.CompanyWhereInput[] = [];

    if (query.city) where.cidade = { equals: query.city, mode: "insensitive" };
    if (query.uf) where.uf = query.uf.toUpperCase();
    if (query.situacaoCadastral) where.situacaoCadastral = { equals: query.situacaoCadastral, mode: "insensitive" };
    if (query.cnae) {
      const cnae = normalizeCnae(query.cnae);
      and.push({
        OR: [{ cnaePrincipal: cnae }, { cnaes: { some: { cnaeCode: cnae } } }],
      });
    }
    if (query.search) {
      and.push({
        OR: [
          { cnpj: { contains: normalizeCnpj(query.search) } },
          { razaoSocial: { contains: query.search, mode: "insensitive" } },
          { nomeFantasia: { contains: query.search, mode: "insensitive" } },
        ],
      });
    }
    if (and.length > 0) where.AND = and;

    return this.prisma.company.findMany({
      where,
      include: { cnaes: true, lead: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async findById(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: { cnaes: true, lead: { include: { assignedTo: { select: safeAssignedToSelect } } } },
    });
    if (!company) throw new NotFoundException("Empresa não encontrada");
    return company;
  }

  create(dto: CreateCompanyDto) {
    return this.upsertCompany({
      cnpj: dto.cnpj,
      razaoSocial: dto.razaoSocial,
      nomeFantasia: dto.nomeFantasia,
      situacaoCadastral: dto.situacaoCadastral,
      porte: dto.porte,
      matrizFilial: dto.matrizFilial,
      dataAbertura: dto.dataAbertura,
      cnaePrincipal: dto.cnaePrincipal,
      cnaes: dto.cnaes,
      uf: dto.uf,
      cidade: dto.cidade,
      bairro: dto.bairro,
      cep: dto.cep,
      logradouro: dto.logradouro,
      numero: dto.numero,
      complemento: dto.complemento,
      latitude: dto.latitude,
      longitude: dto.longitude,
      source: dto.source ?? "manual",
    });
  }

  async update(id: string, dto: UpdateCompanyDto) {
    const cnaes = dto.cnaes?.map((cnae) => normalizeCnae(cnae)).filter(Boolean) as string[] | undefined;
    const company = await this.prisma.company.update({
      where: { id },
      data: {
        ...dto,
        uf: dto.uf?.toUpperCase(),
        cnaePrincipal: normalizeCnae(dto.cnaePrincipal),
        cnaes: cnaes
          ? {
              deleteMany: {},
              create: cnaes.map((cnae) => ({ cnaeCode: cnae, isPrimary: cnae === normalizeCnae(dto.cnaePrincipal) })),
            }
          : undefined,
      },
      include: { cnaes: true, lead: true },
    });
    return company;
  }

  async syncByCnpj(cnpj: string) {
    const external = await this.cnpjProvider.getCompanyByCnpj(cnpj);
    if (!external) throw new NotFoundException("CNPJ não encontrado no provider configurado");
    return this.upsertCompany(external);
  }

  async upsertCompany(input: ExternalCompany) {
    const cnpj = normalizeCnpj(input.cnpj);
    const primaryCnae = normalizeCnae(input.cnaePrincipal);
    const cnaes = Array.from(new Set((input.cnaes?.length ? input.cnaes : [primaryCnae]).filter(Boolean).map((cnae) => normalizeCnae(cnae)!)));

    return this.prisma.company.upsert({
      where: { cnpj },
      create: {
        cnpj,
        razaoSocial: input.razaoSocial,
        nomeFantasia: input.nomeFantasia,
        situacaoCadastral: input.situacaoCadastral,
        porte: input.porte,
        matrizFilial: input.matrizFilial,
        dataAbertura: input.dataAbertura,
        cnaePrincipal: primaryCnae,
        uf: input.uf.toUpperCase(),
        cidade: input.cidade,
        bairro: input.bairro,
        cep: input.cep,
        logradouro: input.logradouro,
        numero: input.numero,
        complemento: input.complemento,
        latitude: input.latitude,
        longitude: input.longitude,
        source: input.source,
        lastSyncAt: new Date(),
        cnaes: {
          create: cnaes.map((cnae) => ({ cnaeCode: cnae, isPrimary: cnae === primaryCnae })),
        },
      },
      update: {
        razaoSocial: input.razaoSocial,
        nomeFantasia: input.nomeFantasia,
        situacaoCadastral: input.situacaoCadastral,
        porte: input.porte,
        matrizFilial: input.matrizFilial,
        dataAbertura: input.dataAbertura,
        cnaePrincipal: primaryCnae,
        uf: input.uf.toUpperCase(),
        cidade: input.cidade,
        bairro: input.bairro,
        cep: input.cep,
        logradouro: input.logradouro,
        numero: input.numero,
        complemento: input.complemento,
        latitude: input.latitude,
        longitude: input.longitude,
        source: input.source,
        lastSyncAt: new Date(),
        cnaes: {
          deleteMany: {},
          create: cnaes.map((cnae) => ({ cnaeCode: cnae, isPrimary: cnae === primaryCnae })),
        },
      },
      include: { cnaes: true, lead: true },
    });
  }
}
