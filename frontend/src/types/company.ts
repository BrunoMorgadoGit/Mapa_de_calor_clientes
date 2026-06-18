export type CompanyCnae = {
  id: string;
  companyId: string;
  cnaeCode: string;
  isPrimary: boolean;
};

export type Company = {
  id: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  situacaoCadastral: string;
  porte: string | null;
  matrizFilial: string | null;
  dataAbertura: string | null;
  cnaePrincipal: string | null;
  uf: string;
  cidade: string;
  bairro: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  latitude: number | null;
  longitude: number | null;
  source: string;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
  cnaes?: CompanyCnae[];
};

export type CompanyQuery = {
  city?: string;
  uf?: string;
  cnae?: string;
  situacaoCadastral?: string;
  search?: string;
};
