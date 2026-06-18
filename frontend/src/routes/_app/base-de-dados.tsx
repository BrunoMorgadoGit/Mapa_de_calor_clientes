import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/InterfaceStates";
import { companyName, formatCnae, formatCnpj } from "@/lib/commercial-formatters";
import { citiesService } from "@/services/citiesService";
import { cnaesService } from "@/services/cnaesService";
import { companiesService } from "@/services/companiesService";
import type { City } from "@/types/city";
import type { Cnae } from "@/types/cnae";
import type { Company } from "@/types/company";
import { FileUp, Search } from "lucide-react";

export const Route = createFileRoute("/_app/base-de-dados")({
  component: BaseDeDados,
});

type Tab = "companies" | "cities" | "cnaes";

const tabs: { id: Tab; label: string }[] = [
  { id: "companies", label: "Empresas" },
  { id: "cities", label: "Cidades" },
  { id: "cnaes", label: "CNAEs" },
];

function normalize(value?: string | null) {
  return (value ?? "").toLowerCase();
}

function BaseDeDados() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [cnaes, setCnaes] = useState<Cnae[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("companies");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [companyData, cityData, cnaeData] = await Promise.all([
        companiesService.getCompanies(),
        citiesService.getCities(),
        cnaesService.getCnaes(),
      ]);
      setCompanies(companyData);
      setCities(cityData);
      setCnaes(cnaeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a base de dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredCompanies = useMemo(() => {
    const term = normalize(search);
    return companies.filter((company) =>
      [companyName(company), company.cnpj, company.cidade, company.uf, company.cnaePrincipal, company.situacaoCadastral].some((item) => normalize(item).includes(term)),
    );
  }, [companies, search]);

  const filteredCities = useMemo(() => {
    const term = normalize(search);
    return cities.filter((city) => [city.name, city.uf, city.ibgeCode].some((item) => normalize(item).includes(term)));
  }, [cities, search]);

  const filteredCnaes = useMemo(() => {
    const term = normalize(search);
    return cnaes.filter((cnae) => [cnae.code, cnae.description, cnae.category].some((item) => normalize(item).includes(term)));
  }, [cnaes, search]);

  return (
    <div>
      <PageHeader
        title="Base de Dados"
        subtitle="Consulte empresas, cidades e CNAEs monitorados."
        actions={
          <Link to="/importar-cnpjs" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0B1F33] px-4 text-sm font-bold text-white transition hover:bg-[#1061AF]">
            <FileUp className="h-4 w-4 text-[#FFF200]" />
            Importar CNPJs
          </Link>
        }
      />

      {error && <div className="mb-4"><ErrorState description={error} action={<button onClick={loadData} className="h-9 rounded-lg bg-[#0B1F33] px-3 text-xs font-bold text-white">Tentar novamente</button>} /></div>}
      {loading ? (
        <LoadingState message="Carregando base de dados..." />
      ) : (
        <section className="overflow-hidden rounded-xl border border-[#DDE5EF] bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-[#DDE5EF] p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`h-9 rounded-lg px-3 text-sm font-bold transition ${
                    activeTab === tab.id
                      ? "bg-[#0B1F33] text-white"
                      : "border border-[#DDE5EF] bg-white text-[#0B1F33] hover:border-[#1061AF]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <label className="relative block w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar na base" className="h-10 w-full rounded-lg border border-[#DDE5EF] bg-[#F8FAFC] pl-9 pr-3 text-sm outline-none focus:border-[#1061AF]" />
            </label>
          </div>

          {activeTab === "companies" && (
            filteredCompanies.length === 0 ? (
              <EmptyState title="Nenhuma empresa encontrada" description="Ajuste a busca ou importe novos CNPJs." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-sm">
                  <thead className="bg-[#F8FAFC] text-[11px] font-bold uppercase text-[#64748B]">
                    <tr>
                      <th className="px-4 py-3">Empresa</th>
                      <th className="px-4 py-3">CNPJ</th>
                      <th className="px-4 py-3">Cidade</th>
                      <th className="px-4 py-3">CNAE</th>
                      <th className="px-4 py-3">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2F7]">
                    {filteredCompanies.map((company) => (
                      <tr key={company.id} className="hover:bg-[#F8FAFC]">
                        <td className="px-4 py-3 font-bold text-[#0B1F33]">{companyName(company)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[#475569]">{formatCnpj(company.cnpj)}</td>
                        <td className="px-4 py-3 text-[#475569]">{company.cidade}/{company.uf}</td>
                        <td className="px-4 py-3 text-[#475569]">{formatCnae(company.cnaePrincipal)}</td>
                        <td className="px-4 py-3 text-[#475569]">{company.situacaoCadastral}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {activeTab === "cities" && (
            filteredCities.length === 0 ? (
              <EmptyState title="Nenhuma cidade encontrada" description="Ajuste a busca para localizar uma cidade monitorada." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="bg-[#F8FAFC] text-[11px] font-bold uppercase text-[#64748B]">
                    <tr>
                      <th className="px-4 py-3">Cidade</th>
                      <th className="px-4 py-3">UF</th>
                      <th className="px-4 py-3">IBGE</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2F7]">
                    {filteredCities.map((city) => (
                      <tr key={city.id} className="hover:bg-[#F8FAFC]">
                        <td className="px-4 py-3 font-bold text-[#0B1F33]">{city.name}</td>
                        <td className="px-4 py-3 text-[#475569]">{city.uf}</td>
                        <td className="px-4 py-3 text-[#475569]">{city.ibgeCode ?? "-"}</td>
                        <td className="px-4 py-3 text-[#475569]">{city.isActive ? "Ativa" : "Inativa"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {activeTab === "cnaes" && (
            filteredCnaes.length === 0 ? (
              <EmptyState title="Nenhum CNAE encontrado" description="Ajuste a busca para localizar um CNAE monitorado." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-[#F8FAFC] text-[11px] font-bold uppercase text-[#64748B]">
                    <tr>
                      <th className="px-4 py-3">Código</th>
                      <th className="px-4 py-3">Descrição</th>
                      <th className="px-4 py-3">Categoria</th>
                      <th className="px-4 py-3">Prioridade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2F7]">
                    {filteredCnaes.map((cnae) => (
                      <tr key={cnae.id} className="hover:bg-[#F8FAFC]">
                        <td className="px-4 py-3 font-bold text-[#0B1F33]">{formatCnae(cnae.code)}</td>
                        <td className="px-4 py-3 text-[#475569]">{cnae.description}</td>
                        <td className="px-4 py-3 text-[#475569]">{cnae.category ?? "-"}</td>
                        <td className="px-4 py-3 text-[#475569]">{cnae.isTarget ? "CNAE alvo" : "Monitorado"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </section>
      )}
    </div>
  );
}
