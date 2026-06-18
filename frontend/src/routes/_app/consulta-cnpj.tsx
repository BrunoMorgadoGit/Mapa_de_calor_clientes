import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { Search, FileSearch, Sparkles, Lightbulb, CheckCircle2, Plus, ArrowRight, Loader2 } from "lucide-react";
import { companiesService } from "@/services/companiesService";
import { leadsService } from "@/services/leadsService";
import { formatCnpj, formatCnae, potentialLabels } from "@/lib/commercial-formatters";
import type { Company } from "@/types/company";
import { toast } from "sonner";
import { LoadingState, ErrorState } from "@/components/app/InterfaceStates";

export const Route = createFileRoute("/_app/consulta-cnpj")({
  component: ConsultaCNPJ,
});

function ConsultaCNPJ() {
  const [cnpj, setCnpj] = useState("11.222.333/0001-44");
  const [loading, setLoading] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);

  const consult = async () => {
    setLoading(true);
    setError(null);
    setCompany(null);
    try {
      const cleanedCnpj = cnpj.replace(/\D/g, "");
      if (!cleanedCnpj || cleanedCnpj.length !== 14) {
        throw new Error("CNPJ inválido. Digite um CNPJ com 14 dígitos.");
      }
      const data = await companiesService.syncByCnpj(cleanedCnpj);
      setCompany(data);
      toast.success("Consulta cadastral realizada com sucesso!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível consultar o CNPJ.");
      toast.error("Erro ao consultar o CNPJ.");
    } finally {
      setLoading(false);
    }
  };

  const saveAsLead = async () => {
    if (!company) return;
    setSavingLead(true);
    try {
      const newLead = await leadsService.createLead({ companyId: company.id });
      setCompany({
        ...company,
        lead: newLead,
      });
      toast.success("Lead B2B criado com sucesso!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar o lead.");
    } finally {
      setSavingLead(false);
    }
  };

  return (
    <div>
      <PageHeader title="Consulta e Enriquecimento por CNPJ" subtitle="Consulte dados cadastrais na API e integre o estabelecimento diretamente ao funil comercial." />

      <div className="bg-white rounded-2xl border border-[#DDE5EF] p-6 lg:p-8">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-end">
          <div className="flex-1">
            <label className="text-xs font-semibold text-[#0B1F33]">CNPJ</label>
            <div className="relative mt-1.5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0000-00"
                className="w-full h-12 rounded-lg border border-[#DDE5EF] bg-[#F8FAFC] pl-10 pr-3 text-base font-mono outline-none focus:border-[#1061AF] focus:ring-2 focus:ring-[#1061AF]/15"
              />
            </div>
          </div>
          <button
            onClick={consult}
            disabled={loading}
            className="h-12 px-6 rounded-lg bg-[#1061AF] hover:bg-[#0F58A0] text-white font-semibold text-sm flex items-center justify-center gap-2 transition disabled:opacity-70"
          >
            {loading ? "Consultando..." : <>Consultar <ArrowRight className="h-4 w-4" /></>}
          </button>
        </div>
        <p className="mt-3 text-xs text-[#64748B]">Insira o CNPJ para buscar informações cadastrais e comerciais na API.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {[
          { icon: FileSearch, t: "Consulta cadastral", d: "Busca dados básicos da empresa.", c: "#1061AF" },
          { icon: Sparkles, t: "Enriquecimento comercial", d: "Complementa CNAE, cidade, perfil e potencial.", c: "#F97316" },
          { icon: Lightbulb, t: "Ação recomendada", d: "Gera uma sugestão de abordagem para o time comercial.", c: "#16A34A" },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.t} className="bg-white rounded-xl border border-[#DDE5EF] p-5">
              <div className="h-10 w-10 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: `${m.c}15` }}>
                <Icon className="h-[18px] w-[18px]" style={{ color: m.c }} />
              </div>
              <div className="font-semibold text-[#0B1F33]">{m.t}</div>
              <p className="text-sm text-[#64748B] mt-1">{m.d}</p>
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="mt-6">
          <LoadingState message="Buscando informações da empresa na API de CNPJ..." />
        </div>
      )}

      {error && (
        <div className="mt-6">
          <ErrorState title="Não foi possível encontrar o CNPJ" description={error} />
        </div>
      )}

      {!loading && company && (
        <div className="mt-6 bg-white rounded-2xl border border-[#DDE5EF] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#DDE5EF] flex items-center justify-between bg-[#F8FAFC]">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0B1F33]">
              <CheckCircle2 className="h-4 w-4 text-[#16A34A]" /> Resultado da consulta
            </div>
            <span className="text-xs text-[#64748B]">Atualizado em tempo real</span>
          </div>
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ["Razão social", company.razaoSocial],
                ["Nome fantasia", company.nomeFantasia ?? "-"],
                ["CNPJ", formatCnpj(company.cnpj)],
                ["CNAE", formatCnae(company.cnaePrincipal)],
                ["Cidade", `${company.cidade}/${company.uf}`],
                ["Situação cadastral", company.situacaoCadastral],
                ["Potencial comercial", company.lead ? potentialLabels[company.lead.potentialLevel as keyof typeof potentialLabels] || company.lead.potentialLevel : "Não cadastrado como lead"],
                ["Score", company.lead ? String(company.lead.score) : "-"],
              ].map(([l, v]) => (
                <div key={l} className="border-b border-dashed border-[#DDE5EF] pb-2">
                  <div className="text-[11px] uppercase text-[#64748B] font-semibold">{l}</div>
                  <div className="text-sm font-semibold text-[#0B1F33] mt-1">{v}</div>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-[#FFF200]/15 ring-1 ring-[#CA8A04]/20 p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#854D0E]">
                <Sparkles className="h-3.5 w-3.5" /> Recomendação
              </div>
              <p className="text-sm text-[#0B1F33] mt-2 leading-relaxed font-medium">
                {company.lead ? (
                  company.lead.potentialLevel === "CRITICAL" || company.lead.potentialLevel === "HIGH" ? (
                    "Priorizar visita presencial com oferta inicial Deusa."
                  ) : (
                    "Fazer contato telefônico para qualificação e validação do mix."
                  )
                ) : (
                  "Cadastre a empresa como lead B2B para habilitar o cálculo de score e a recomendação de ação comercial."
                )}
              </p>
              <div className="mt-4 space-y-2">
                {!company.lead ? (
                  <button
                    onClick={saveAsLead}
                    disabled={savingLead}
                    className="w-full h-10 rounded-lg bg-[#1061AF] hover:bg-[#0F58A0] text-white text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-75"
                  >
                    {savingLead ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4" /> Salvar como lead B2B
                      </>
                    )}
                  </button>
                ) : (
                  <div className="w-full h-10 rounded-lg bg-[#16A34A]/10 border border-[#16A34A]/25 text-[#15803D] text-sm font-semibold flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Já cadastrado como Lead
                  </div>
                )}
                <button
                  disabled={!company.lead}
                  className="w-full h-10 rounded-lg bg-white border border-[#DDE5EF] hover:border-[#1061AF] text-[#0B1F33] text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => toast.info("Funcionalidade em desenvolvimento.")}
                >
                  Gerar recomendação detalhada
                </button>
                <button
                  disabled={!company.lead}
                  className="w-full h-10 rounded-lg bg-white border border-[#DDE5EF] hover:border-[#1061AF] text-[#0B1F33] text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => toast.info("Funcionalidade em desenvolvimento.")}
                >
                  Adicionar à rota
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
