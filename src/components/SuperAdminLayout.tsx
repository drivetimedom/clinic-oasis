import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
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
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Building2,
  Users,
  LogOut,
  Settings,
  Shield,
  ArrowLeft,
  Activity,
  Palette,
} from "lucide-react";

function SuperAdminSidebarContent() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { title: "Dashboard Plataforma", url: "/admin", icon: LayoutDashboard },
    { title: "Clínicas", url: "/admin/clinics", icon: Building2 },
    { title: "Usuários da Plataforma", url: "/admin/users", icon: Users },
    { title: "Atividade do Sistema", url: "/admin/activity", icon: Activity },
    { title: "Personalização", url: "/admin/branding", icon: Palette },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-[10px] bg-destructive/15 border border-destructive/25 flex items-center justify-center shrink-0">
            <Shield className="h-4 w-4 text-destructive" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-[13.5px] font-semibold text-foreground leading-tight">Hof Circle</h1>
              <p className="text-[11.5px] text-subtle leading-tight">Super Admin</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-3 scrollbar-thin">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-subtle px-3 pt-4 pb-2">Plataforma</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end
                      className="group relative flex items-center gap-3 px-3 py-2 rounded-[10px] text-[13.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors duration-[180ms]"
                      activeClassName="bg-foreground/[0.06] text-foreground before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[2px] before:-translate-y-1/2 before:rounded-full before:bg-primary [&>svg]:text-primary"
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
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Voltar ao sistema">
              <NavLink to="/" end activeClassName="" className="flex items-center gap-3 px-3 py-2 rounded-[10px] text-[13.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors duration-[180ms]">
                <ArrowLeft className="h-[17px] w-[17px]" />
                <span>Voltar ao sistema</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export function SuperAdminLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || "SA";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <SuperAdminSidebarContent />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-[58px] flex items-center justify-between border-b border-border px-5 shrink-0 bg-surface/60 sticky top-0 z-30 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-destructive" />
                <span className="font-medium text-[13.5px]">Painel Super Admin</span>
              </div>
              <Badge variant="destructive" className="text-[10.5px]">Super Admin</Badge>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 px-1.5">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-destructive/12 text-destructive text-[10.5px] font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-[13px] hidden sm:inline max-w-[130px] truncate">{profile?.full_name || user?.email?.split("@")[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-[11.5px] font-normal text-subtle">{user?.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/")}>
                    <ArrowLeft className="h-4 w-4 mr-2" />Voltar ao sistema
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto scrollbar-thin">
            <div className="mx-auto w-full max-w-[1400px] px-8 py-8 animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
