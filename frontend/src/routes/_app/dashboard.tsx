import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { SkeletonMetricCards } from "@/components/app/InterfaceStates";
import { dashboardService } from "@/services/dashboardService";
import type { DashboardSummary } from "@/types/dashboard";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileUp,
  Sparkles,
  UserX,
} from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

const recommendedActions = [
  "Importar CNPJs ativos da cidade foco.",
  "Distribuir leads críticos para o responsável comercial.",
  "Registrar contato nos leads sem interação recente.",
];

function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadSummary() {
    setLoading(true);
    setError(null);
    try {
      setSummary(await dashboardService.getSummary());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a Central Comercial.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  const summaryCards = [
    { label: "Potenciais clientes", value: summary?.potentialClients ?? 0, icon: Sparkles },
    { label: "Clientes ativos", value: summary?.activeClients ?? 0, icon: CheckCircle2 },
    { label: "Clientes inativos", value: summary?.inactiveClients ?? 0, icon: UserX },
    { label: "Oportunidades críticas", value: summary?.criticalOpportunities ?? 0, icon: AlertTriangle, alert: true },
  ];

  return (
    <div>
      <PageHeader
        title="Central Comercial"
        subtitle="Visão rápida das principais oportunidades de expansão B2B"
        actions={
          <>
            <Link to="/importar-cnpjs" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0B1F33] px-4 text-sm font-bold text-white transition hover:bg-[#1061AF]">
              <FileUp className="h-4 w-4 text-[#FFF200]" />
              Importar novos CNPJs
            </Link>
            <Link to="/leads-b2b" className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#DDE5EF] bg-white px-4 text-sm font-bold text-[#0B1F33] transition hover:border-[#1061AF]">
              <Building2 className="h-4 w-4 text-[#1061AF]" />
              Ver leads
            </Link>
          </>
        }
      />

      {error && (
        <div className="mb-5 flex flex-col gap-3 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm text-[#7F1D1D] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#ED1C24]" />
            <span>{error}</span>
          </div>
          <button onClick={loadSummary} className="h-8 w-fit rounded-md bg-[#0B1F33] px-3 text-xs font-bold text-white">
            Tentar novamente
          </button>
        </div>
      )}

      {loading ? (
        <SkeletonMetricCards count={4} />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-xl border border-[#DDE5EF] bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-3xl font-bold leading-none text-[#0B1F33] tabular-nums">{card.value}</div>
                    <div className="mt-2 text-sm font-bold text-[#0B1F33]">{card.label}</div>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.alert ? "bg-[#ED1C24]/10 text-[#ED1C24]" : "bg-[#1061AF]/10 text-[#1061AF]"}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-xl border border-[#DDE5EF] bg-white shadow-sm">
          <div className="border-b border-[#DDE5EF] px-6 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-xs font-bold uppercase text-[#1061AF]">Prioridade da semana</div>
                <h2 className="mt-2 text-2xl font-bold text-[#0B1F33]">{summary?.priorityCity ?? "Sem prioridade definida"}</h2>
              </div>
              <span className="w-fit rounded-md bg-[#ED1C24] px-3 py-1.5 text-xs font-bold text-white">Crítico</span>
            </div>
          </div>

          <div className="grid gap-0 md:grid-cols-4">
            <div className="border-b border-[#DDE5EF] p-5 md:border-b-0 md:border-r">
              <div className="text-xs font-bold uppercase text-[#64748B]">Cidade foco</div>
              <div className="mt-2 text-lg font-bold text-[#0B1F33]">{summary?.priorityCity ?? "-"}</div>
            </div>
            <div className="border-b border-[#DDE5EF] p-5 md:border-b-0 md:border-r">
              <div className="text-xs font-bold uppercase text-[#64748B]">CNAE foco</div>
              <div className="mt-2 text-lg font-bold text-[#0B1F33]">{summary?.priorityCnae ?? "-"}</div>
            </div>
            <div className="border-b border-[#DDE5EF] p-5 md:border-b-0 md:border-r">
              <div className="text-xs font-bold uppercase text-[#64748B]">Oportunidades</div>
              <div className="mt-2 text-lg font-bold text-[#0B1F33] tabular-nums">{summary?.criticalOpportunities ?? 0}</div>
            </div>
            <div className="p-5">
              <div className="text-xs font-bold uppercase text-[#64748B]">Próxima ação</div>
              <div className="mt-2 text-sm font-bold leading-snug text-[#0B1F33]">Importar CNPJs e acionar leads críticos.</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#DDE5EF] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-[#0B1F33]">Ações recomendadas</h2>
          <div className="mt-4 grid gap-3">
            {recommendedActions.map((action, index) => (
              <div key={action} className="flex items-start gap-3 rounded-lg bg-[#F8FAFC] p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-xs font-bold text-[#0B1F33] ring-1 ring-[#DDE5EF]">
                  {index + 1}
                </span>
                <p className="text-sm font-semibold leading-relaxed text-[#0B1F33]">{action}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
