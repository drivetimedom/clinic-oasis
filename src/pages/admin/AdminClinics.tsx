import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/activityLog";
import { Plus, Building2, Ban, CheckCircle, Pencil, Search, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

type ClinicForm = {
  name: string;
  cnpj: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  address: string;
};

const emptyForm: ClinicForm = { name: "", cnpj: "", phone: "", email: "", city: "", state: "", address: "" };

function ClinicFormFields({ form, setForm }: { form: ClinicForm; setForm: (f: ClinicForm) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nome *</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Nome da clínica" />
        </div>
        <div className="space-y-2">
          <Label>CNPJ</Label>
          <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contato@clinica.com" />
        </div>
        <div className="space-y-2">
          <Label>Telefone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Cidade</Label>
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="São Paulo" />
        </div>
        <div className="space-y-2">
          <Label>Estado</Label>
          <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="SP" maxLength={2} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Endereço</Label>
        <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua, número, bairro..." />
      </div>
    </div>
  );
}

export default function AdminClinics() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editClinic, setEditClinic] = useState<any>(null);
  const [form, setForm] = useState<ClinicForm>({ ...emptyForm });

  const { data: clinics = [], isLoading } = useQuery({
    queryKey: ["admin_all_clinics"],
    queryFn: async () => {
      const { data } = await supabase.from("clinics").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("clinics").insert({
        name: form.name,
        cnpj: form.cnpj || null,
        phone: form.phone || null,
        email: form.email || null,
        city: form.city || null,
        state: form.state || null,
        address: form.address || null,
      } as any).select("id").single();
      if (error) throw error;
      await logActivity("Clínica criada", `Clínica "${form.name}" foi criada`, "clinic", data.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_all_clinics"] });
      toast({ title: "Clínica criada com sucesso!" });
      setCreateOpen(false);
      setForm({ ...emptyForm });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (clinic: any) => {
      const { error } = await supabase.from("clinics").update({
        name: clinic.name,
        cnpj: clinic.cnpj || null,
        phone: clinic.phone || null,
        email: clinic.email || null,
        city: clinic.city || null,
        state: clinic.state || null,
        address: clinic.address || null,
      } as any).eq("id", clinic.id);
      if (error) throw error;
      await logActivity("Clínica editada", `Clínica "${clinic.name}" foi atualizada`, "clinic", clinic.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_all_clinics"] });
      toast({ title: "Clínica atualizada!" });
      setEditClinic(null);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status, name }: { id: string; status: string; name: string }) => {
      const newStatus = status === "active" ? "suspended" : "active";
      const { error } = await supabase.from("clinics").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
      await logActivity(
        newStatus === "active" ? "Clínica ativada" : "Clínica suspensa",
        `Clínica "${name}" foi ${newStatus === "active" ? "ativada" : "suspensa"}`,
        "clinic", id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_all_clinics"] });
      toast({ title: "Status atualizado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const handleEnterAsClinic = (clinicId: string) => {
    localStorage.setItem("hc_current_clinic", clinicId);
    localStorage.setItem("hc_sa_mode", "true");
    navigate("/");
    // Force reload to reset ClinicContext
    window.location.href = "/";
  };

  const filtered = clinics.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.cnpj || "").includes(search)
  );

  const statusLabel = (s: string) => {
    if (s === "active") return "Ativa";
    if (s === "suspended") return "Suspensa";
    return "Bloqueada";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Gestão de Clínicas</h1>
          <p className="text-muted-foreground text-sm">{clinics.length} clínicas cadastradas</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Nova Clínica</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Criar Nova Clínica</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}>
              <ClinicFormFields form={form} setForm={setForm} />
              <Button type="submit" className="w-full mt-4" disabled={createMutation.isPending || !form.name}>
                {createMutation.isPending ? "Criando..." : "Criar Clínica"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar clínica..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clínica</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {c.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.cnpj || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.phone || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {c.city && c.state ? `${c.city}/${c.state}` : c.city || c.state || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.status === "active" ? "default" : "destructive"} className="text-xs">
                      {statusLabel(c.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" title="Entrar como clínica" onClick={() => handleEnterAsClinic(c.id)}>
                      <LogIn className="h-4 w-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditClinic(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={c.status === "active" ? "Suspender" : "Ativar"}
                      onClick={() => toggleStatusMutation.mutate({ id: c.id, status: c.status, name: c.name })}
                    >
                      {c.status === "active" ? (
                        <Ban className="h-4 w-4 text-destructive" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {isLoading ? "Carregando..." : "Nenhuma clínica encontrada."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editClinic} onOpenChange={(open) => !open && setEditClinic(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar Clínica</DialogTitle></DialogHeader>
          {editClinic && (
            <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(editClinic); }}>
              <ClinicFormFields
                form={{
                  name: editClinic.name || "",
                  cnpj: editClinic.cnpj || "",
                  phone: editClinic.phone || "",
                  email: editClinic.email || "",
                  city: editClinic.city || "",
                  state: editClinic.state || "",
                  address: editClinic.address || "",
                }}
                setForm={(f) => setEditClinic({ ...editClinic, ...f })}
              />
              <Button type="submit" className="w-full mt-4" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
