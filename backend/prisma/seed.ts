import { PrismaClient, ImportStatus, LeadStatus, PotentialLevel, UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const salesPassword = await bcrypt.hash("deusa123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@deusa.com.br" },
    update: {},
    create: {
      name: "Administrador Deusa",
      email: "admin@deusa.com.br",
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  const rafael = await prisma.user.upsert({
    where: { email: "rafael.mendes@deusa.com.br" },
    update: {},
    create: {
      name: "Rafael Mendes",
      email: "rafael.mendes@deusa.com.br",
      passwordHash: salesPassword,
      role: UserRole.SALES,
    },
  });

  const citySeed = [
    ["Tupã", "SP", "3555000"],
    ["Marília", "SP", "3529005"],
    ["Pompeia", "SP", "3540002"],
    ["Garça", "SP", "3516705"],
    ["Bastos", "SP", "3505807"],
  ] as const;

  for (const [name, uf, ibgeCode] of citySeed) {
    await prisma.city.upsert({
      where: { name_uf: { name, uf } },
      update: { ibgeCode, isActive: true },
      create: { name, uf, ibgeCode, isActive: true },
    });
  }

  const cnaes = [
    { code: "4711302", description: "Supermercados", category: "Varejo alimentar", isTarget: true },
    { code: "4712100", description: "Minimercados, mercearias e armazéns", category: "Varejo alimentar", isTarget: true },
  ];

  for (const cnae of cnaes) {
    await prisma.cnae.upsert({
      where: { code: cnae.code },
      update: cnae,
      create: cnae,
    });
  }

  const companies = [
    {
      cnpj: "12345678000190",
      razaoSocial: "Mercadinho Sao Jose de Tupa Ltda",
      nomeFantasia: "Mercadinho São José",
      situacaoCadastral: "ATIVA",
      porte: "ME",
      matrizFilial: "MATRIZ",
      dataAbertura: new Date("2018-04-12"),
      cnaePrincipal: "4712100",
      uf: "SP",
      cidade: "Tupã",
      bairro: "Centro",
      cep: "17600010",
      logradouro: "Rua Caingangs",
      numero: "430",
      latitude: -21.9347,
      longitude: -50.5136,
      source: "seed",
      score: 90,
      status: LeadStatus.NEW,
      potentialLevel: PotentialLevel.CRITICAL,
    },
    {
      cnpj: "23456789000167",
      razaoSocial: "Supermercado Avenida Marilia Ltda",
      nomeFantasia: "Supermercado Avenida",
      situacaoCadastral: "ATIVA",
      porte: "EPP",
      matrizFilial: "MATRIZ",
      dataAbertura: new Date("2012-09-03"),
      cnaePrincipal: "4711302",
      uf: "SP",
      cidade: "Marília",
      bairro: "Jardim Maria Izabel",
      cep: "17515000",
      logradouro: "Avenida Sampaio Vidal",
      numero: "1850",
      latitude: -22.2171,
      longitude: -49.9501,
      source: "seed",
      score: 89,
      status: LeadStatus.CONTACTED,
      potentialLevel: PotentialLevel.HIGH,
    },
    {
      cnpj: "11222333000144",
      razaoSocial: "Emporio Familia Pompeia Ltda",
      nomeFantasia: "Empório Família",
      situacaoCadastral: "ATIVA",
      porte: "ME",
      matrizFilial: "MATRIZ",
      dataAbertura: new Date("2020-01-20"),
      cnaePrincipal: "4712100",
      uf: "SP",
      cidade: "Pompeia",
      bairro: "Centro",
      cep: "17580000",
      logradouro: "Rua Getulio Vargas",
      numero: "112",
      latitude: -22.107,
      longitude: -50.1712,
      source: "seed",
      score: 88,
      status: LeadStatus.INTERESTED,
      potentialLevel: PotentialLevel.HIGH,
    },
    {
      cnpj: "45678901000123",
      razaoSocial: "Mercado Uniao Garca Ltda",
      nomeFantasia: "Mercado União",
      situacaoCadastral: "ATIVA",
      porte: "EPP",
      matrizFilial: "MATRIZ",
      dataAbertura: new Date("2016-07-18"),
      cnaePrincipal: "4712100",
      uf: "SP",
      cidade: "Garça",
      bairro: "Williams",
      cep: "17400000",
      logradouro: "Rua Carlos Ferrari",
      numero: "760",
      latitude: -22.2125,
      longitude: -49.6546,
      source: "seed",
      score: 84,
      status: LeadStatus.NEGOTIATION,
      potentialLevel: PotentialLevel.HIGH,
    },
    {
      cnpj: "78901234000156",
      razaoSocial: "Mini Mercado Central Bastos Ltda",
      nomeFantasia: "Mini Mercado Central",
      situacaoCadastral: "ATIVA",
      porte: "ME",
      matrizFilial: "MATRIZ",
      dataAbertura: new Date("2019-05-11"),
      cnaePrincipal: "4712100",
      uf: "SP",
      cidade: "Bastos",
      bairro: "Centro",
      cep: "17690000",
      logradouro: "Rua Presidente Vargas",
      numero: "95",
      latitude: -21.921,
      longitude: -50.7358,
      source: "seed",
      score: 72,
      status: LeadStatus.CONVERTED,
      potentialLevel: PotentialLevel.MEDIUM,
    },
  ];

  for (const item of companies) {
    const { score, status, potentialLevel, ...companyData } = item;
    const company = await prisma.company.upsert({
      where: { cnpj: companyData.cnpj },
      update: {
        ...companyData,
        lastSyncAt: new Date(),
        cnaes: {
          deleteMany: {},
          create: [{ cnaeCode: companyData.cnaePrincipal, isPrimary: true }],
        },
      },
      create: {
        ...companyData,
        lastSyncAt: new Date(),
        cnaes: {
          create: [{ cnaeCode: companyData.cnaePrincipal, isPrimary: true }],
        },
      },
    });

    const lead = await prisma.lead.upsert({
      where: { companyId: company.id },
      update: {
        status,
        score,
        potentialLevel,
        assignedToId: rafael.id,
      },
      create: {
        companyId: company.id,
        status,
        score,
        potentialLevel,
        assignedToId: rafael.id,
        notes: "Lead inicial criado via seed para validação do MVP interno.",
      },
    });

    await prisma.leadInteraction.deleteMany({ where: { leadId: lead.id } });
    if (status !== LeadStatus.NEW) {
      await prisma.leadInteraction.create({
        data: {
          leadId: lead.id,
          userId: status === LeadStatus.CONVERTED ? admin.id : rafael.id,
          type: status === LeadStatus.CONVERTED ? "Pedido" : "Contato comercial",
          description:
            status === LeadStatus.CONVERTED
              ? "Primeiro pedido registrado e lead convertido em cliente."
              : "Contato inicial registrado para validação de interesse e mix de produtos.",
        },
      });
    }
  }

  await prisma.importJob.create({
    data: {
      uf: "SP",
      cityName: "Tupã",
      cityIbgeCode: "3555000",
      cnaeCode: "4712100",
      status: ImportStatus.SUCCESS,
      totalFound: 1,
      totalSaved: 1,
      startedAt: new Date(),
      finishedAt: new Date(),
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
