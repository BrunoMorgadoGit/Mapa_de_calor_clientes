import { apiRequest } from "./api";
import type { Pipeline } from "@/types/pipeline";

export const pipelineService = {
  getPipeline: () => apiRequest<Pipeline>("/pipeline"),
};
