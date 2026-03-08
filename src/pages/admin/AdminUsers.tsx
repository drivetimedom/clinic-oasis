import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, UserPlus, Trash2, Building2, Users } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  manager: "Gestor",
  reception: "Recepção",
  financial: "Financeiro",
  profissional: "Profissional",
};

export default function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("reception");

  const { data: clinics = [] } = useQuery({
    queryKey: ["admin_clinics_list"],
    queryFn: async () => {
      const { data } = await supabase.from("clinics").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["admin_all_members"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clinic_members")
        .select("*, clinics(name), profiles(full_name)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase.from("clinic_members").update({ role: role as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_all_members"] });
      toast({ title: "Papel atualizado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clinic_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_all_members"] });
      toast({ title: "Membro removido!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const addMemberMutation = useMutation({
    mutationFn: async () => {
      // Look up user by email in profiles (we can't query auth.users from client)
      // For now, we search profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .limit(100);

      // We need to find the user - since we can't search by email in profiles,
      // we'll need a different approach. Let's use a workaround.
      toast({
        title: "Funcionalidade limitada",
        description: "Para adicionar um membro, o usuário precisa primeiro criar uma conta no sistema. Depois, use o ID do usuário para associá-lo à clínica.",
      });
    },
  });

  const filtered = members.filter((m: any) => {
    const name = (m.profiles as any)?.full_name || "";
    const clinicName = (m.clinics as any)?.name || "";
    const term = search.toLowerCase();
    return name.toLowerCase().includes(term) || clinicName.toLowerCase().includes(term) || m.role.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Usuários</h1>
          <p className="text-muted-foreground text-sm">{members.length} usuários em todas as clínicas</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, clínica ou papel..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Clínica</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Desde</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {(m.profiles as any)?.full_name || m.user_id.slice(0, 8) + "..."}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{(m.clinics as any)?.name || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select value={m.role} onValueChange={(v) => updateRoleMutation.mutate({ id: m.id, role: v })}>
                      <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(m.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => removeMutation.mutate(m.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {isLoading ? "Carregando..." : "Nenhum usuário encontrado."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
