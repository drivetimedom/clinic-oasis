import {
  LayoutDashboard,
  Users,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  CalendarDays,
  Stethoscope,
  Clock,
  Settings,
  Syringe,
  Package,
  Receipt,
  CreditCard,
  Percent,
  FileBarChart,
  FileSignature,
  UserCog,
  CalendarClock,
  UserX,
  MessageSquare,
  Target,
  DollarSign,
  TrendingUp,
  PieChart,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useClinic } from "@/contexts/ClinicContext";
import { useAttendanceMode } from "@/contexts/AttendanceModeContext";
import { hasPermission, type Permission } from "@/lib/permissions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const NAV_LINK =
  "group relative flex items-center gap-3 px-3 py-2 rounded-[10px] text-[13.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors duration-[180ms]";

const NAV_ACTIVE =
  "bg-foreground/[0.06] text-foreground before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[2px] before:-translate-y-1/2 before:rounded-full before:bg-primary [&>svg]:text-primary";

type MenuItem = { title: string; url: string; icon: any; permission: Permission };

const agendaItems: MenuItem[] = [
  { title: "Agenda", url: "/agenda", icon: CalendarDays, permission: "agenda" },
  { title: "Lista de Espera", url: "/waitlist", icon: CalendarClock, permission: "agenda" },
  { title: "Doutoras", url: "/doctors", icon: Stethoscope, permission: "doctors" },
  { title: "Disponibilidade", url: "/availability", icon: Clock, permission: "availability" },
];

const financialItems: MenuItem[] = [
  { title: "Faturamento", url: "/billing", icon: Receipt, permission: "billing" },
  { title: "Pagamentos", url: "/billing/payments", icon: CreditCard, permission: "billing" },
  { title: "Comissões", url: "/billing/commissions", icon: Percent, permission: "commissions" },
  { title: "Relatórios", url: "/billing/reports", icon: FileBarChart, permission: "financial_reports" },
  { title: "Contas a Receber", url: "/receivables", icon: ArrowDownCircle, permission: "receivables" },
  { title: "Contas a Pagar", url: "/payables", icon: ArrowUpCircle, permission: "payables" },
  { title: "Fluxo de Caixa", url: "/cash-flow", icon: BarChart3, permission: "cashflow" },
];

const clinicItems: MenuItem[] = [
  { title: "Pacientes", url: "/patients", icon: Users, permission: "patients" },
];

const procedureItems: MenuItem[] = [
  { title: "Categorias", url: "/procedures/categories", icon: Syringe, permission: "procedures" },
  { title: "Procedimentos", url: "/procedures", icon: Syringe, permission: "procedures" },
  { title: "Protocolos", url: "/procedures/protocols", icon: Syringe, permission: "procedures" },
];

const stockItems: MenuItem[] = [
  { title: "Produtos", url: "/stock/products", icon: Package, permission: "stock" },
  { title: "Movimentações", url: "/stock/movements", icon: Package, permission: "stock" },
  { title: "Controle de Lotes", url: "/stock/batches", icon: Package, permission: "stock" },
];

const consentItems: MenuItem[] = [
  { title: "Modelos de Termo", url: "/consent/templates", icon: FileSignature, permission: "consent" },
  { title: "Solicitações", url: "/consent/requests", icon: FileSignature, permission: "consent" },
  { title: "Assinaturas", url: "/consent/signatures", icon: FileSignature, permission: "consent" },
];

const teamItems: MenuItem[] = [
  { title: "Profissionais", url: "/team/professionals", icon: UserCog, permission: "team" },
  { title: "Cargos", url: "/team/positions", icon: UserCog, permission: "team" },
  { title: "Comissões", url: "/team/commissions", icon: Percent, permission: "team" },
  { title: "Perfis de Usuário", url: "/team/profiles", icon: UserCog, permission: "team" },
];

const crmItems: MenuItem[] = [
  { title: "Retornos", url: "/crm/return", icon: CalendarClock, permission: "crm" },
  { title: "Inativos", url: "/crm/inactive", icon: UserX, permission: "crm" },
  { title: "Histórico", url: "/crm/history", icon: MessageSquare, permission: "crm" },
];

const planningItems: MenuItem[] = [
  { title: "Custos da Clínica", url: "/planning/costs", icon: DollarSign, permission: "planning" },
  { title: "Precificação", url: "/planning/pricing", icon: TrendingUp, permission: "planning" },
  { title: "Metas", url: "/planning/goals", icon: Target, permission: "planning" },
  { title: "Métricas de Captação", url: "/planning/acquisition", icon: PieChart, permission: "planning" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { role } = useClinic();
  const { isAttendanceMode } = useAttendanceMode();

  const { data: settings } = useQuery({
    queryKey: ["platform-settings-public"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("key, value");
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value; });
      return map;
    },
  });

  const logoUrl = settings?.logo_url || "";
  const logoText = settings?.logo_text || "H";

  const isActive = (path: string) => location.pathname === path;

  const filterByPermission = (items: MenuItem[]) =>
    items.filter((item) => hasPermission(role, item.permission));

  const renderGroup = (label: string, items: MenuItem[]) => {
    const visible = filterByPermission(items);
    if (visible.length === 0) return null;
    return (
      <SidebarGroup key={label}>
        <SidebarGroupLabel className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-subtle px-3 pt-7 pb-2">
          {label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                  <NavLink
                    to={item.url}
                    end
                    activeClassName={NAV_ACTIVE}
                    className={NAV_LINK}
                  >
                    <item.icon className="h-[17px] w-[17px] shrink-0 opacity-90" />
                    <span>{item.title}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <div className="h-8 w-8 rounded-[10px] border border-border bg-foreground/[0.04] flex items-center justify-center shrink-0 overflow-hidden">
              <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
            </div>
          ) : (
            <div className="h-8 w-8 rounded-[10px] bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-semibold text-[14px]">{logoText.charAt(0)}</span>
            </div>
          )}
          {!collapsed && (
            <div>
              <p className="text-[13.5px] font-semibold text-foreground leading-tight">Hof Circle</p>
              <p className="text-[11.5px] text-subtle leading-tight">Gestão</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-3 scrollbar-thin">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {!isAttendanceMode && hasPermission(role, "dashboard") && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/")} tooltip="Dashboard">
                    <NavLink
                      to="/"
                      end
                      activeClassName={NAV_ACTIVE}
                      className={NAV_LINK}
                    >
                      <LayoutDashboard className="h-[17px] w-[17px] shrink-0 opacity-90" />
                      <span>Dashboard</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {renderGroup("Agendamento", agendaItems)}
        {renderGroup("Procedimentos", procedureItems)}
        {!isAttendanceMode && renderGroup("Estoque", stockItems)}
        {!isAttendanceMode && renderGroup("Financeiro", financialItems)}
        {!isAttendanceMode && renderGroup("Planejamento", planningItems)}
        {!isAttendanceMode && renderGroup("Equipe", teamItems)}
        {renderGroup("Termos", consentItems)}
        {!isAttendanceMode && renderGroup("CRM", crmItems)}
        {renderGroup("Clínica", clinicItems)}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border">
        <SidebarMenu>
          {hasPermission(role, "settings") && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/settings")} tooltip="Configurações">
                <NavLink
                  to="/settings"
                  end
                  activeClassName={NAV_ACTIVE}
                  className={NAV_LINK}
                >
                  <Settings className="h-[17px] w-[17px] shrink-0 opacity-90" />
                  <span>Configurações</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
