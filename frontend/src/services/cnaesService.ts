import { apiRequest } from "./api";
import type { Cnae } from "@/types/cnae";

export const cnaesService = {
  getCnaes: () => apiRequest<Cnae[]>("/cnaes"),
};
