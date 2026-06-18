import { apiRequest } from "./api";
import type { ImportCnpjPayload, ImportCnpjResponse, ImportJob } from "@/types/importJob";

export const importsService = {
  importCnpjs: (payload: ImportCnpjPayload) =>
    apiRequest<ImportCnpjResponse>("/imports/cnpj", { method: "POST", body: JSON.stringify(payload) }),
  getImports: () => apiRequest<ImportJob[]>("/imports"),
  getImport: (id: string) => apiRequest<ImportJob>(`/imports/${id}`),
};
