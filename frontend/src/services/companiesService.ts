import { apiRequest } from "./api";
import type { Company, CompanyQuery } from "@/types/company";

export const companiesService = {
  getCompanies: (query?: CompanyQuery) => apiRequest<Company[]>("/companies", {}, query),
  getCompany: (id: string) => apiRequest<Company>(`/companies/${id}`),
  syncByCnpj: (cnpj: string) => apiRequest<Company>(`/companies/sync/${cnpj}`, { method: "POST" }),
};

