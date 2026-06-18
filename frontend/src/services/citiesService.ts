import { apiRequest } from "./api";
import type { City } from "@/types/city";

export const citiesService = {
  getCities: () => apiRequest<City[]>("/cities"),
};
