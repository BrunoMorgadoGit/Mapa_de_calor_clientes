export type RegistrationStatus = "ATIVA" | "BAIXADA" | "SUSPENSA" | "INAPTA";

export interface Establishment {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnaePrincipal: string;
  descricaoCnae: string;
  situacaoCadastral: RegistrationStatus;
  uf: string;
  cidade: string;
  bairro: string;
  endereco: string;
  cep: string;
  latitude: number;
  longitude: number;
}

export interface EstablishmentSearchFilters {
  cnaePrincipal: string;
  uf: string;
  cidade?: string;
  bairro?: string;
  raioKm?: number;
}

export interface EstablishmentSummary {
  totalFound: number;
  selectedCnaeCount: number;
  analyzedCity: string;
  topNeighborhood: string;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  establishment: Establishment;
}

export interface CnaeOption {
  code: string;
  description: string;
  label: string;
}
