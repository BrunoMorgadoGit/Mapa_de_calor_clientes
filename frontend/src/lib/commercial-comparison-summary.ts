import generatedSummary from "@/data/commercial-comparison-summary.json";

export type CommercialComparisonSummary = {
  generatedAt: string;
  source: string;
  totals: {
    clientesEncontrados: number;
    potenciaisClientes: number;
    clientesInativos: number;
    dadosIncompletos: number;
    estabelecimentosSemCorrespondencia: number;
    regioesComOportunidade: number;
  };
  regioesComOportunidade: Array<{ regiao: string; opportunities: number }>;
  cidadesComOportunidade: Array<{ cidade: string; opportunities: number }>;
  estabelecimentosSemCorrespondencia: Array<{
    nome_estabelecimento: string;
    cnpj: string;
    cidade: string;
    regiao: string;
    classification: string;
    reason: string;
  }>;
};

const fallbackSummary: CommercialComparisonSummary = {
  generatedAt: "",
  source: "fallback",
  totals: {
    clientesEncontrados: 0,
    potenciaisClientes: 0,
    clientesInativos: 0,
    dadosIncompletos: 0,
    estabelecimentosSemCorrespondencia: 0,
    regioesComOportunidade: 0,
  },
  regioesComOportunidade: [],
  cidadesComOportunidade: [],
  estabelecimentosSemCorrespondencia: [],
};

function isSummary(value: unknown): value is CommercialComparisonSummary {
  if (!value || typeof value !== "object") return false;
  const summary = value as Partial<CommercialComparisonSummary>;
  return Boolean(summary.totals && typeof summary.totals.clientesEncontrados === "number");
}

export const commercialComparisonSummary: CommercialComparisonSummary = isSummary(generatedSummary)
  ? generatedSummary
  : fallbackSummary;
