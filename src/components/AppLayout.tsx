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
import { Building2, LogOut, Settings, Shield, Bell, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, type AppRole } from "@/lib/permissions";

export function AppLayout() {
  const { currentClinic, clinics, role, setCurrentClinicId, isSuperAdminMode, exitSuperAdminMode } = useClinic();
  const { user } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

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
          {isSuperAdminMode && (
            <div className="bg-destructive/10 border-b border-destructive/20 px-6 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13px]">
                <Shield className="h-4 w-4 text-destructive" />
                <span className="text-destructive font-medium">
                  Modo Super Admin — {currentClinic?.name}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={exitSuperAdminMode}>
                Sair do modo clínica
              </Button>
            </div>
          )}
          <header className="h-14 flex items-center justify-between border-b border-[hsl(0_0%_100%/0.06)] px-6 shrink-0 bg-[hsl(0_0%_100%/0.02)]">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              {clinics.length > 1 ? (
                <Select value={currentClinic?.id || ""} onValueChange={setCurrentClinicId}>
                  <SelectTrigger className="w-[200px] border-none bg-transparent font-semibold text-[15px]">
                    <Building2 className="h-4 w-4 mr-2 text-primary" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {clinics.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-[15px]">{currentClinic?.name}</span>
                </div>
              )}
              {role && (
                <Badge variant="outline" className="text-[11px] hidden sm:inline-flex">
                  {ROLE_LABELS[role as AppRole] || role}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="relative text-muted-foreground" onClick={toggleTheme} title={theme === "dark" ? "Modo claro" : "Modo escuro"}>
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="relative text-muted-foreground">
                <Bell className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-[15px] hidden sm:inline text-muted-foreground">{profile?.full_name || user?.email?.split("@")[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-[11px] text-muted-foreground">{user?.email}</DropdownMenuLabel>
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
          <main className="flex-1 overflow-auto p-6 scrollbar-thin">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
