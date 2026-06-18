import { PotentialLevel } from "@prisma/client";

export type ScoreInput = {
  situacaoCadastral?: string | null;
  cnaePrincipal?: string | null;
  targetCnaes?: string[];
  nomeFantasia?: string | null;
  porte?: string | null;
  cidade?: string | null;
  priorityCities?: string[];
  latitude?: number | null;
  longitude?: number | null;
};

function normalize(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

export function calculateLeadScore(input: ScoreInput) {
  let score = 0;
  const status = normalize(input.situacaoCadastral);
  const porte = normalize(input.porte);
  const city = normalize(input.cidade);
  const targetCnaes = new Set((input.targetCnaes ?? []).map((cnae) => cnae.replace(/\D/g, "")));
  const cnae = (input.cnaePrincipal ?? "").replace(/\D/g, "");

  if (status === "ATIVA" || status === "ATIVO") score += 30;
  if (cnae && targetCnaes.has(cnae)) score += 25;
  if (input.nomeFantasia?.trim()) score += 15;
  if (porte === "ME" || porte === "EPP") score += 10;
  if ((input.priorityCities ?? []).map(normalize).includes(city)) score += 10;
  if (typeof input.latitude === "number" && typeof input.longitude === "number") score += 10;

  return Math.max(0, Math.min(100, score));
}

export function getPotentialLevel(score: number): PotentialLevel {
  if (score >= 90) return PotentialLevel.CRITICAL;
  if (score >= 75) return PotentialLevel.HIGH;
  if (score >= 50) return PotentialLevel.MEDIUM;
  return PotentialLevel.LOW;
}
