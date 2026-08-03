import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { useClinic } from "@/contexts/ClinicContext";
import { useAuth } from "@/hooks/useAuth";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { useAttendanceMode } from "@/contexts/AttendanceModeContext";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Building2, LogOut, Settings, Shield, Bell, Sun, Moon, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, type AppRole } from "@/lib/permissions";
import { GlobalSearch } from "@/components/GlobalSearch";

export function AppLayout() {
  const { currentClinic, clinics, role, setCurrentClinicId, isSuperAdminMode, exitSuperAdminMode } = useClinic();
  const { user } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { isAttendanceMode, toggleAttendanceMode } = useAttendanceMode();

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
    : user?.email?.slice(0, 2).toUpperCase() || "HC";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {isAttendanceMode && (
            <div className="bg-primary/[0.07] border-b border-primary/20 px-6 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12.5px]">
                <Stethoscope className="h-3.5 w-3.5 text-primary" />
                <span className="text-primary font-medium">Modo de Atendimento ativo</span>
              </div>
              <Button variant="ghost" size="sm" onClick={toggleAttendanceMode}>Sair do modo atendimento</Button>
            </div>
          )}
          {isSuperAdminMode && (
            <div className="bg-destructive/[0.07] border-b border-destructive/20 px-6 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12.5px]">
                <Shield className="h-3.5 w-3.5 text-destructive" />
                <span className="text-destructive font-medium">
                  Modo Super Admin — {currentClinic?.name}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={exitSuperAdminMode}>
                Sair do modo clínica
              </Button>
            </div>
          )}
          <header className="h-[58px] flex items-center justify-between gap-4 border-b border-border px-5 shrink-0 bg-surface/60 sticky top-0 z-30 backdrop-blur-sm">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger className="text-subtle hover:text-foreground transition-colors duration-[180ms]" />
              <div className="h-5 w-px bg-border hidden sm:block" />
              {clinics.length > 1 ? (
                <Select value={currentClinic?.id || ""} onValueChange={setCurrentClinicId}>
                  <SelectTrigger className="h-9 w-[210px] border-none bg-transparent px-2 font-medium text-[13.5px] hover:bg-accent/60 focus:ring-0 focus:border-none">
                    <Building2 className="h-4 w-4 mr-2 text-subtle" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {clinics.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="h-4 w-4 text-subtle shrink-0" />
                  <span className="font-medium text-[13.5px] truncate">{currentClinic?.name}</span>
                </div>
              )}
              {role && (
                <Badge variant="outline" className="text-[10.5px] hidden md:inline-flex">
                  {ROLE_LABELS[role as AppRole] || role}
                </Badge>
              )}
            </div>

            <div className="hidden md:flex flex-1 justify-center px-4">
              <GlobalSearch />
            </div>

            <div className="flex items-center gap-1">
              {!isAttendanceMode && (
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={toggleAttendanceMode}>
                  <Stethoscope className="h-[15px] w-[15px]" />
                  <span className="hidden lg:inline text-[12.5px]">Modo Atendimento</span>
                </Button>
              )}
              <Button variant="ghost" size="icon" className="relative" onClick={toggleTheme} title={theme === "dark" ? "Modo claro" : "Modo escuro"}>
                {theme === "dark" ? <Sun className="h-[15px] w-[15px]" /> : <Moon className="h-[15px] w-[15px]" />}
              </Button>
              <Button variant="ghost" size="icon" className="relative" title="Notificações">
                <Bell className="h-[15px] w-[15px]" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
              </Button>
              <div className="h-5 w-px bg-border mx-1" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 px-1.5">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-primary/12 text-primary text-[10.5px] font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-[13px] hidden sm:inline max-w-[130px] truncate">{profile?.full_name || user?.email?.split("@")[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-[11.5px] font-normal text-subtle">{user?.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isSuperAdmin && (
                    <>
                      <DropdownMenuItem onClick={() => navigate("/admin")}>
                        <Shield className="h-4 w-4 mr-2" />Painel Admin
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Settings className="h-4 w-4 mr-2" />Configurações
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
