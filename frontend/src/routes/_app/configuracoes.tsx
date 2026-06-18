import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { Bell, Database, ShieldCheck, Users } from "lucide-react";

export const Route = createFileRoute("/_app/configuracoes")({
  component: Settings,
});

function Settings() {
  return (
    <div>
      <PageHeader
        title="Configurações"
        subtitle="Parâmetros internos para operação comercial, acesso e atualização de dados."
      />

      <section className="grid gap-4 lg:grid-cols-2">
        {[
          { icon: Database, title: "Fontes de dados", text: "CNPJs, base interna de clientes, CNAEs monitorados e atualização de importações." },
          { icon: Users, title: "Equipe comercial", text: "Responsáveis por região, distribuição de leads e permissões por perfil." },
          { icon: Bell, title: "Notificações", text: "Alertas para oportunidades críticas, leads sem contato e importações concluídas." },
          { icon: ShieldCheck, title: "Governança", text: "Controle de acesso, trilhas de auditoria e regras para descarte de oportunidades." },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-xl border border-[#DDE5EF] bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1061AF]/10">
                  <Icon className="h-5 w-5 text-[#1061AF]" />
                </div>
                <div>
                  <h2 className="font-bold text-[#0B1F33]">{item.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-[#64748B]">{item.text}</p>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
