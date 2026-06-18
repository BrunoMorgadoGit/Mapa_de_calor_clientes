export type CnpjSearchPayload = {
  uf: string;
  cityName: string;
  cityIbgeCode?: string;
  cnaeCode: string;
  limit: number;
};

export type ExternalCompany = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  situacaoCadastral: string;
  porte?: string | null;
  matrizFilial?: string | null;
  dataAbertura?: Date | null;
  cnaePrincipal?: string | null;
  cnaes?: string[];
  uf: string;
  cidade: string;
  bairro?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  source: string;
};

export interface CnpjProvider {
  searchCompaniesByCityAndCnae(payload: CnpjSearchPayload): Promise<ExternalCompany[]>;
  getCompanyByCnpj(cnpj: string): Promise<ExternalCompany | null>;
}

export const CNPJ_PROVIDER = Symbol("CNPJ_PROVIDER");
