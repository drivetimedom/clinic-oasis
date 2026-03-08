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
import { hasPermission, type Permission } from "@/lib/permissions";

type MenuItem = { title: string; url: string; icon: any; permission: Permission };

const agendaItems: MenuItem[] = [
  { title: "Agenda", url: "/agenda", icon: CalendarDays, permission: "agenda" },
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
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { role } = useClinic();

  const isActive = (path: string) => location.pathname === path;

  const filterByPermission = (items: MenuItem[]) =>
    items.filter((item) => hasPermission(role, item.permission));

  const renderGroup = (label: string, items: MenuItem[]) => {
    const visible = filterByPermission(items);
    if (visible.length === 0) return null;
    return (
      <SidebarGroup key={label}>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                  <NavLink to={item.url} end activeClassName="bg-sidebar-accent text-primary font-medium">
                    <item.icon className="h-4 w-4" />
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
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-sm">HC</span>
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-sm font-bold text-foreground">Hof Circle</h1>
              <p className="text-xs text-muted-foreground">Gestão</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {hasPermission(role, "dashboard") && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/")} tooltip="Dashboard">
                    <NavLink to="/" end activeClassName="bg-sidebar-accent text-primary font-medium">
                      <LayoutDashboard className="h-4 w-4" />
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
        {renderGroup("Estoque", stockItems)}
        {renderGroup("Financeiro", financialItems)}
        {renderGroup("Termos e Consentimentos", consentItems)}
        {renderGroup("Clínica", clinicItems)}
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          {hasPermission(role, "settings") && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/settings")} tooltip="Configurações">
                <NavLink to="/settings" end activeClassName="bg-sidebar-accent text-primary font-medium">
                  <Settings className="h-4 w-4" />
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
