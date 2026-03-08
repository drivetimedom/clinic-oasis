import {
  LayoutDashboard,
  Users,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  LogOut,
  CalendarDays,
  Stethoscope,
  Clock,
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
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const financialItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Contas a Receber", url: "/receivables", icon: ArrowDownCircle },
  { title: "Contas a Pagar", url: "/payables", icon: ArrowUpCircle },
  { title: "Fluxo de Caixa", url: "/cash-flow", icon: BarChart3 },
];

const agendaItems = [
  { title: "Agenda", url: "/agenda", icon: CalendarDays },
  { title: "Doutoras", url: "/doctors", icon: Stethoscope },
  { title: "Disponibilidade", url: "/availability", icon: Clock },
];

const clinicItems = [
  { title: "Pacientes", url: "/patients", icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const renderGroup = (label: string, items: typeof financialItems) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
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
        {renderGroup("Agendamento", agendaItems)}
        {renderGroup("Financeiro", financialItems)}
        {renderGroup("Clínica", clinicItems)}
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Sair">
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
