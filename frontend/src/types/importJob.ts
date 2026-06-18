import type { Company } from "./company";

export type ImportStatus = "PENDING" | "RUNNING" | "SUCCESS" | "ERROR";

export type ImportJob = {
  id: string;
  uf: string;
  cityName: string;
  cityIbgeCode: string | null;
  cnaeCode: string;
  status: ImportStatus;
  totalFound: number;
  totalSaved: number;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
};

export type ImportCnpjPayload = {
  uf: string;
  cityName: string;
  cityIbgeCode?: string;
  cnaeCode: string;
  limit: number;
};

export type ImportCnpjResponse = {
  job: ImportJob;
  companies: Company[];
};
