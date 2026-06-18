import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/InterfaceStates";
import { potentialLabels, statusLabels } from "@/lib/commercial-formatters";
import { pipelineService } from "@/services/pipelineService";
import type { Pipeline } from "@/types/pipeline";
import type { LeadStatus } from "@/types/lead";
import { CircleDot } from "lucide-react";

export const Route = createFileRoute("/_app/funil-comercial")({
  component: CommercialFunnel,
});

const columns: LeadStatus[] = ["NEW", "CONTACTED", "INTERESTED", "NEGOTIATION", "CONVERTED"];

function CommercialFunnel() {
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadPipeline() {
    setLoading(true);
    setError(null);
    try {
      setPipeline(await pipelineService.getPipeline());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o funil.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPipeline();
  }, []);

  return (
    <div>
      <PageHeader
        title="Funil Comercial"
        subtitle="Acompanhamento visual das oportunidades B2B por etapa comercial."
      />

      {error && <div className="mb-4"><ErrorState description={error} action={<button onClick={loadPipeline} className="h-9 rounded-lg bg-[#0B1F33] px-3 text-xs font-bold text-white">Tentar novamente</button>} /></div>}

      {loading ? (
        <LoadingState message="Carregando funil comercial..." />
      ) : !pipeline ? (
        <EmptyState title="Funil indisponível" description="Não há dados de pipeline para exibir." />
      ) : (
        <>
          <section className="mb-4 rounded-xl border border-[#DDE5EF] bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="font-bold text-[#0B1F33]">
                {columns.reduce((total, column) => total + (pipeline[column]?.length ?? 0), 0)} leads no funil
              </span>
              <span className="text-[#64748B]">Priorize os cards com maior score nas etapas iniciais.</span>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-5">
            {columns.map((column) => {
              const columnLeads = pipeline[column] ?? [];
              return (
                <div key={column} className="rounded-xl border border-[#DDE5EF] bg-white shadow-sm">
                  <div className="border-b border-[#DDE5EF] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <CircleDot className="h-4 w-4 text-[#1061AF]" />
                        <h2 className="font-bold text-[#0B1F33]">{statusLabels[column]}</h2>
                      </div>
                      <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs font-bold text-[#0B1F33]">{columnLeads.length}</span>
                    </div>
                  </div>

                  <div className="min-h-[420px] space-y-3 bg-[#F8FAFC] p-3">
                    {columnLeads.map((lead) => (
                      <article key={lead.id} className="rounded-lg border border-[#DDE5EF] bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold leading-snug text-[#0B1F33]">{lead.companyName}</h3>
                            <p className="mt-1 text-xs font-semibold text-[#64748B]">{lead.city}</p>
                          </div>
                          <span className="rounded-md bg-[#1061AF]/10 px-2 py-1 text-xs font-bold text-[#0F58A0]">{lead.score}</span>
                        </div>
                        <div className="mt-3 rounded-md bg-[#FFFBEB] px-3 py-2 text-xs font-bold text-[#854D0E] ring-1 ring-[#FDE68A]">
                          {potentialLabels[lead.potentialLevel]}
                        </div>
                      </article>
                    ))}

                    {columnLeads.length === 0 && (
                      <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-dashed border-[#CBD5E1] bg-white p-4 text-center text-sm font-medium text-[#64748B]">
                        Nenhum lead nesta etapa.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
