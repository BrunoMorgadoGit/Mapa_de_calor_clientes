import { normalizeCnpj } from "../../common/cnpj";
import { CnpjProvider, CnpjSearchPayload, ExternalCompany } from "./cnpj-provider.interface";

const baseCompanies: ExternalCompany[] = [
  {
    cnpj: "12345678000190",
    razaoSocial: "Mercadinho Sao Jose de Tupa Ltda",
    nomeFantasia: "Mercadinho São José",
    situacaoCadastral: "ATIVA",
    porte: "ME",
    matrizFilial: "MATRIZ",
    dataAbertura: new Date("2018-04-12"),
    cnaePrincipal: "4712100",
    cnaes: ["4712100"],
    uf: "SP",
    cidade: "Tupã",
    bairro: "Centro",
    cep: "17600010",
    logradouro: "Rua Caingangs",
    numero: "430",
    latitude: -21.9347,
    longitude: -50.5136,
    source: "mock-cnpj-provider",
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
    cnaes: ["4711302", "4712100"],
    uf: "SP",
    cidade: "Marília",
    bairro: "Jardim Maria Izabel",
    cep: "17515000",
    logradouro: "Avenida Sampaio Vidal",
    numero: "1850",
    latitude: -22.2171,
    longitude: -49.9501,
    source: "mock-cnpj-provider",
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
    cnaes: ["4712100"],
    uf: "SP",
    cidade: "Pompeia",
    bairro: "Centro",
    cep: "17580000",
    logradouro: "Rua Getulio Vargas",
    numero: "112",
    latitude: -22.107,
    longitude: -50.1712,
    source: "mock-cnpj-provider",
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
    cnaes: ["4712100"],
    uf: "SP",
    cidade: "Garça",
    bairro: "Williams",
    cep: "17400000",
    logradouro: "Rua Carlos Ferrari",
    numero: "760",
    latitude: -22.2125,
    longitude: -49.6546,
    source: "mock-cnpj-provider",
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
    cnaes: ["4712100"],
    uf: "SP",
    cidade: "Bastos",
    bairro: "Centro",
    cep: "17690000",
    logradouro: "Rua Presidente Vargas",
    numero: "95",
    latitude: -21.921,
    longitude: -50.7358,
    source: "mock-cnpj-provider",
  },
];

export class MockCnpjProvider implements CnpjProvider {
  async searchCompaniesByCityAndCnae(payload: CnpjSearchPayload) {
    const cnae = payload.cnaeCode.replace(/\D/g, "");
    const city = payload.cityName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    const filtered = baseCompanies.filter((company) => {
      const companyCity = company.cidade
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      return company.uf === payload.uf.toUpperCase() && companyCity === city && (company.cnaes ?? []).includes(cnae);
    });

    const fallback = filtered.length > 0 ? filtered : this.generateFallbackCompanies(payload);
    return fallback.slice(0, payload.limit);
  }

  async getCompanyByCnpj(cnpj: string) {
    const normalized = normalizeCnpj(cnpj);
    return baseCompanies.find((company) => company.cnpj === normalized) ?? null;
  }

  private generateFallbackCompanies(payload: CnpjSearchPayload): ExternalCompany[] {
    const citySlug = payload.cityName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\W/g, "")
      .slice(0, 6)
      .padEnd(6, "0");

    return Array.from({ length: Math.min(payload.limit, 5) }).map((_, index) => {
      const sequence = String(index + 1).padStart(2, "0");
      return {
        cnpj: `${citySlug}${sequence}0001${String(10 + index).padStart(2, "0")}`.replace(/\D/g, "").padStart(14, "0").slice(0, 14),
        razaoSocial: `Comercial ${payload.cityName} ${index + 1} Ltda`,
        nomeFantasia: `Mercado ${payload.cityName} ${index + 1}`,
        situacaoCadastral: "ATIVA",
        porte: index % 2 === 0 ? "ME" : "EPP",
        matrizFilial: "MATRIZ",
        dataAbertura: new Date("2021-01-10"),
        cnaePrincipal: payload.cnaeCode.replace(/\D/g, ""),
        cnaes: [payload.cnaeCode.replace(/\D/g, "")],
        uf: payload.uf.toUpperCase(),
        cidade: payload.cityName,
        bairro: index % 2 === 0 ? "Centro" : "Distrito Comercial",
        cep: "00000000",
        logradouro: "Rua Comercial",
        numero: String(100 + index),
        latitude: null,
        longitude: null,
        source: "mock-cnpj-provider",
      };
    });
  }
}
