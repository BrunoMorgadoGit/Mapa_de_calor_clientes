import { apiRequest } from "./api";
import type { DashboardSummary } from "@/types/dashboard";

export const dashboardService = {
  getSummary: () => apiRequest<DashboardSummary>("/dashboard/summary"),
};
