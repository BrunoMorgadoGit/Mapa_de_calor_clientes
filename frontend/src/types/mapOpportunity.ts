import type { LeadStatus, PotentialLevel } from "./lead";

export type MapOpportunity = {
  id: string;
  companyName: string;
  cnpj: string;
  city: string;
  uf: string;
  bairro: string | null;
  latitude: number | null;
  longitude: number | null;
  score: number;
  status: LeadStatus;
  potentialLevel: PotentialLevel;
};
