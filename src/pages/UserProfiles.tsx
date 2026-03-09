import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Shield, ShieldCheck } from "lucide-react";
import { ROLE_LABELS, type AppRole, type Permission, getPermissions as getStaticPermissions } from "@/lib/permissions";

const PERMISSION_GROUPS: { label: string; permissions: { key: Permission; label: string }[] }[] = [
  {
    label: "Agendamento",
    permissions: [
      { key: "agenda", label: "Agenda" },
      { key: "doctors", label: "Doutoras" },
      { key: "availability", label: "Disponibilidade" },
    ],
  },
  {
    label: "Clínica",
    permissions: [
      { key: "patients", label: "Pacientes" },
      { key: "procedures", label: "Procedimentos" },
      { key: "consent", label: "Termos de Consentimento" },
    ],
  },
  {
    label: "Financeiro",
    permissions: [
      { key: "billing", label: "Faturamento" },
      { key: "commissions", label: "Comissões" },
      { key: "receivables", label: "Contas a Receber" },
      { key: "payables", label: "Contas a Pagar" },
      { key: "cashflow", label: "Fluxo de Caixa" },
      { key: "financial_reports", label: "Relatórios Financeiros" },
    ],
  },
  {
    label: "Gestão",
    permissions: [
      { key: "stock", label: "Estoque" },
      { key: "team", label: "Equipe" },
      { key: "crm", label: "CRM" },
      { key: "planning", label: "Planejamento" },
      { key: "reports", label: "Relatórios" },
      { key: "settings", label: "Configurações" },
    ],
  },
];

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));

const ROLES: AppRole[] = ["admin", "manager", "profissional", "reception", "financial"];

export default function UserProfiles() {
  const { currentClinic } = useClinic();
  const queryClient = useQueryClient();
  const [activeRole, setActiveRole] = useState<AppRole>("reception");
  const clinicId = currentClinic?.id;

  const { data: overrides = [] } = useQuery({
    queryKey: ["clinic-role-permissions", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_role_permissions")
        .select("*")
        .eq("clinic_id", clinicId!);
      if (error) throw error;
      return data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ role, permission, enabled }: { role: string; permission: string; enabled: boolean }) => {
      const existing = overrides.find((o) => o.role === role && o.permission === permission);
      if (existing) {
        const { error } = await supabase
          .from("clinic_role_permissions")
          .update({ enabled })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("clinic_role_permissions")
          .insert({ clinic_id: clinicId!, role, permission, enabled });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-role-permissions", clinicId] });
      toast.success("Permissão atualizada");
    },
    onError: () => toast.error("Erro ao atualizar permissão"),
  });

  const isPermissionEnabled = (role: string, permission: string): boolean => {
    if (role === "admin") return true;
    const override = overrides.find((o) => o.role === role && o.permission === permission);
    if (override) return override.enabled;
    const { getPermissions } = await import("@/lib/permissions");
    return getPermissions(role).includes(permission as Permission);
  };

  const isAdmin = activeRole === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Perfis de Usuário</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure quais módulos cada perfil pode acessar na sua clínica.
        </p>
      </div>

      <Tabs value={activeRole} onValueChange={(v) => setActiveRole(v as AppRole)}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {ROLES.map((role) => (
            <TabsTrigger key={role} value={role} className="gap-2">
              {role === "admin" ? <ShieldCheck className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
              {ROLE_LABELS[role]}
            </TabsTrigger>
          ))}
        </TabsList>

        {ROLES.map((role) => (
          <TabsContent key={role} value={role} className="space-y-4 mt-4">
            {role === "admin" && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="py-4">
                  <p className="text-sm text-primary font-medium flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    O perfil Administrador possui acesso total ao sistema e não pode ser restrito.
                  </p>
                </CardContent>
              </Card>
            )}

            {PERMISSION_GROUPS.map((group) => (
              <Card key={group.label}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{group.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {group.permissions.map((perm) => {
                    const enabled = isPermissionEnabled(role, perm.key);
                    return (
                      <div key={perm.key} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">{perm.label}</span>
                          <Badge variant={enabled ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                            {enabled ? "Permitido" : "Bloqueado"}
                          </Badge>
                        </div>
                        <Switch
                          checked={enabled}
                          disabled={role === "admin" || toggleMutation.isPending}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({ role, permission: perm.key, enabled: checked })
                          }
                        />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
