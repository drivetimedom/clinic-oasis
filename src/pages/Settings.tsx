import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Building2, Users, UserCog } from "lucide-react";
import { ROLE_LABELS, type AppRole, hasPermission } from "@/lib/permissions";

export default function Settings() {
  const { currentClinic, role, refetch } = useClinic();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "reception" as string });
  const [clinicForm, setClinicForm] = useState({
    name: currentClinic?.name || "",
    phone: currentClinic?.phone || "",
    email: currentClinic?.email || "",
    address: currentClinic?.address || "",
  });

  const isAdmin = role === "admin";

  const { data: members = [] } = useQuery({
    queryKey: ["clinic_members", currentClinic?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("clinic_members")
        .select("*, profiles(full_name)")
        .eq("clinic_id", currentClinic!.id)
        .order("created_at");
      return data || [];
    },
    enabled: !!currentClinic,
  });

  const updateClinicMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clinics").update({
        name: clinicForm.name,
        phone: clinicForm.phone || null,
        email: clinicForm.email || null,
        address: clinicForm.address || null,
      }).eq("id", currentClinic!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast({ title: "Clínica atualizada!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("invite-member", {
        body: { email: inviteForm.email, role: inviteForm.role, clinic_id: currentClinic!.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic_members"] });
      setInviteOpen(false);
      setInviteForm({ email: "", role: "reception" });
      toast({ title: "Membro adicionado com sucesso!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: string }) => {
      const { error } = await supabase.from("clinic_members").update({ role: newRole as any }).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic_members"] });
      toast({ title: "Papel atualizado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("clinic_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic_members"] });
      toast({ title: "Membro removido!" });
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <Tabs defaultValue="clinic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clinic" className="gap-2"><Building2 className="h-4 w-4" />Clínica</TabsTrigger>
          <TabsTrigger value="members" className="gap-2"><Users className="h-4 w-4" />Equipe</TabsTrigger>
          <TabsTrigger value="profile" className="gap-2"><UserCog className="h-4 w-4" />Meu Perfil</TabsTrigger>
        </TabsList>

        <TabsContent value="clinic">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Clínica</CardTitle>
              <CardDescription>Informações básicas da sua clínica</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); updateClinicMutation.mutate(); }} className="space-y-4 max-w-lg">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={clinicForm.name} onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })} required disabled={!isAdmin} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={clinicForm.phone} onChange={(e) => setClinicForm({ ...clinicForm, phone: e.target.value })} disabled={!isAdmin} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={clinicForm.email} onChange={(e) => setClinicForm({ ...clinicForm, email: e.target.value })} disabled={!isAdmin} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input value={clinicForm.address} onChange={(e) => setClinicForm({ ...clinicForm, address: e.target.value })} disabled={!isAdmin} />
                </div>
                {isAdmin && (
                  <Button type="submit" disabled={updateClinicMutation.isPending}>
                    {updateClinicMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Equipe</CardTitle>
                <CardDescription>Membros com acesso a esta clínica</CardDescription>
              </div>
              {isAdmin && (
                <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2"><Plus className="h-4 w-4" />Adicionar Membro</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Adicionar Membro à Equipe</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate(); }} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Email do usuário</Label>
                        <Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="email@exemplo.com" required />
                        <p className="text-xs text-muted-foreground">O usuário precisa ter uma conta criada no sistema.</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Cargo / Papel</Label>
                        <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROLE_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full" disabled={inviteMutation.isPending}>
                        {inviteMutation.isPending ? "Adicionando..." : "Adicionar Membro"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Desde</TableHead>
                    {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        {(m.profiles as any)?.full_name || m.user_id.slice(0, 8) + "..."}
                        {m.user_id === user?.id && <Badge variant="outline" className="ml-2 text-xs">Você</Badge>}
                      </TableCell>
                      <TableCell>
                        {isAdmin && m.user_id !== user?.id ? (
                          <Select value={m.role} onValueChange={(v) => updateRoleMutation.mutate({ memberId: m.id, newRole: v })}>
                            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary">{ROLE_LABELS[m.role as AppRole] || m.role}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(m.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          {m.user_id !== user?.id && (
                            <Button variant="ghost" size="icon" onClick={() => removeMemberMutation.mutate(m.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (data) setFullName(data.full_name || "");
      return data;
    },
    enabled: !!user,
  });

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase.from("profiles").upsert({ id: user!.id, full_name: fullName });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Perfil atualizado!" });
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meu Perfil</CardTitle>
        <CardDescription>Suas informações pessoais</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-lg">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user?.email || ""} disabled />
        </div>
        <div className="space-y-2">
          <Label>Nome Completo</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
        </div>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Salvando..." : "Salvar Perfil"}
        </Button>
      </CardContent>
    </Card>
  );
}
