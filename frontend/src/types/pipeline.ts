import type { PotentialLevel } from "./lead";

export type PipelineCard = {
  id: string;
  companyName: string;
  city: string;
  score: number;
  potentialLevel: PotentialLevel;
  assignedTo: string | null;
};

export type Pipeline = {
  NEW: PipelineCard[];
  CONTACTED: PipelineCard[];
  INTERESTED: PipelineCard[];
  NEGOTIATION: PipelineCard[];
  CONVERTED: PipelineCard[];
};
