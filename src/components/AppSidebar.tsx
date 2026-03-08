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
  { title: "Contas a Receber", url: "/receivables", icon: ArrowDownCircle, permission: "receivables" },
  { title: "Contas a Pagar", url: "/payables", icon: ArrowUpCircle, permission: "payables" },
  { title: "Fluxo de Caixa", url: "/cash-flow", icon: BarChart3, permission: "cashflow" },
];

const clinicItems: MenuItem[] = [
  { title: "Pacientes", url: "/patients", icon: Users, permission: "patients" },
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
        {renderGroup("Financeiro", financialItems)}
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
