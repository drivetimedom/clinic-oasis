import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useClinic } from "@/contexts/ClinicContext";
import { hasPermission, type Permission } from "@/lib/permissions";

type Entry = { title: string; url: string; group: string; permission: Permission };

const ENTRIES: Entry[] = [
  { title: "Dashboard", url: "/", group: "Geral", permission: "dashboard" },
  { title: "Agenda", url: "/agenda", group: "Agendamento", permission: "agenda" },
  { title: "Lista de Espera", url: "/waitlist", group: "Agendamento", permission: "agenda" },
  { title: "Doutoras", url: "/doctors", group: "Agendamento", permission: "doctors" },
  { title: "Disponibilidade", url: "/availability", group: "Agendamento", permission: "availability" },
  { title: "Pacientes", url: "/patients", group: "Clínica", permission: "patients" },
  { title: "Procedimentos", url: "/procedures", group: "Procedimentos", permission: "procedures" },
  { title: "Categorias", url: "/procedures/categories", group: "Procedimentos", permission: "procedures" },
  { title: "Protocolos", url: "/procedures/protocols", group: "Procedimentos", permission: "procedures" },
  { title: "Produtos", url: "/stock/products", group: "Estoque", permission: "stock" },
  { title: "Movimentações", url: "/stock/movements", group: "Estoque", permission: "stock" },
  { title: "Controle de Lotes", url: "/stock/batches", group: "Estoque", permission: "stock" },
  { title: "Faturamento", url: "/billing", group: "Financeiro", permission: "billing" },
  { title: "Pagamentos", url: "/billing/payments", group: "Financeiro", permission: "billing" },
  { title: "Comissões", url: "/billing/commissions", group: "Financeiro", permission: "commissions" },
  { title: "Relatórios", url: "/billing/reports", group: "Financeiro", permission: "financial_reports" },
  { title: "Contas a Receber", url: "/receivables", group: "Financeiro", permission: "receivables" },
  { title: "Contas a Pagar", url: "/payables", group: "Financeiro", permission: "payables" },
  { title: "Fluxo de Caixa", url: "/cash-flow", group: "Financeiro", permission: "cashflow" },
  { title: "Custos da Clínica", url: "/planning/costs", group: "Planejamento", permission: "planning" },
  { title: "Precificação", url: "/planning/pricing", group: "Planejamento", permission: "planning" },
  { title: "Metas", url: "/planning/goals", group: "Planejamento", permission: "planning" },
  { title: "Métricas de Captação", url: "/planning/acquisition", group: "Planejamento", permission: "planning" },
  { title: "Profissionais", url: "/team/professionals", group: "Equipe", permission: "team" },
  { title: "Cargos", url: "/team/positions", group: "Equipe", permission: "team" },
  { title: "Perfis de Usuário", url: "/team/profiles", group: "Equipe", permission: "team" },
  { title: "Modelos de Termo", url: "/consent/templates", group: "Termos", permission: "consent" },
  { title: "Solicitações", url: "/consent/requests", group: "Termos", permission: "consent" },
  { title: "Assinaturas", url: "/consent/signatures", group: "Termos", permission: "consent" },
  { title: "Retornos", url: "/crm/return", group: "CRM", permission: "crm" },
  { title: "Inativos", url: "/crm/inactive", group: "CRM", permission: "crm" },
  { title: "Histórico", url: "/crm/history", group: "CRM", permission: "crm" },
  { title: "Configurações", url: "/settings", group: "Geral", permission: "settings" },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { role } = useClinic();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const visible = ENTRIES.filter((e) => hasPermission(role, e.permission));
  const groups = Array.from(new Set(visible.map((e) => e.group)));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-9 w-full max-w-[320px] items-center gap-2 rounded-[10px] border border-border bg-surface px-3 text-[13px] text-subtle transition-colors duration-[180ms] hover:border-foreground/12 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <Search className="h-[15px] w-[15px]" />
        <span className="flex-1 text-left">Buscar…</span>
        <kbd className="hidden sm:inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10.5px] font-medium text-subtle">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar módulos e páginas…" />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          {groups.map((g) => (
            <CommandGroup key={g} heading={g}>
              {visible
                .filter((e) => e.group === g)
                .map((e) => (
                  <CommandItem
                    key={e.url}
                    value={`${e.group} ${e.title}`}
                    onSelect={() => {
                      setOpen(false);
                      navigate(e.url);
                    }}
                  >
                    {e.title}
                  </CommandItem>
                ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
