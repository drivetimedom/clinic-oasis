import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClinic } from "@/contexts/ClinicContext";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Search } from "lucide-react";

export default function TeamProfessionals() {
  const { user } = useAuth();
  const { currentClinic } = useClinic();
  const clinicId = currentClinic!.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "", cpf: "", phone: "", email: "", specialty: "",
    position_id: "", hire_date: "", commission_percentage: "0",
    active: true, color: "#4ade80",
  });

  const { data: positions = [] } = useQuery({
    queryKey: ["positions", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("positions").select("id, name").eq("clinic_id", clinicId).order("name");
      return data || [];
    },
  });

  const { data: professionals = [], isLoading } = useQuery({
    queryKey: ["team-professionals", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("doctors")
        .select("*, positions(name)")
        .eq("clinic_id", clinicId)
        .order("name");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        clinic_id: clinicId,
        user_id: user!.id,
        name: form.name,
        cpf: form.cpf || null,
        phone: form.phone || null,
        email: form.email || null,
        specialty: form.specialty || null,
        position_id: form.position_id || null,
        hire_date: form.hire_date || null,
        commission_percentage: parseFloat(form.commission_percentage) || 0,
        active: form.active,
        color: form.color,
      };
      if (editId) {
        const { error } = await supabase.from("doctors").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("doctors").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-professionals"] });
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      closeDialog();
      toast({ title: editId ? "Profissional atualizado!" : "Profissional cadastrado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("doctors").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-professionals"] });
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
    },
  });

  const closeDialog = () => {
    setOpen(false);
    setEditId(null);
    setForm({ name: "", cpf: "", phone: "", email: "", specialty: "", position_id: "", hire_date: "", commission_percentage: "0", active: true, color: "#4ade80" });
  };

  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      name: p.name, cpf: p.cpf || "", phone: p.phone || "", email: p.email || "",
      specialty: p.specialty || "", position_id: p.position_id || "",
      hire_date: p.hire_date || "", commission_percentage: String(p.commission_percentage || 0),
      active: p.active, color: p.color || "#4ade80",
    });
    setOpen(true);
  };

  const filtered = professionals.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.specialty || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Profissionais</h1>
        <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
          <DialogTrigger asChild><Button size="lg" className="gap-2"><Plus className="h-5 w-5" />Criar Membro da Equipe</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Editar Profissional" : "Novo Profissional"}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2"><Label>Nome Completo</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>CPF</Label><Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" /></div>
                <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Select value={form.position_id} onValueChange={(v) => setForm({ ...form, position_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {positions.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Especialidade</Label><Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="Ex: Dermatologia" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Data de Contratação</Label><Input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} /></div>
                <div className="space-y-2"><Label>Comissão Padrão (%)</Label><Input type="number" step="0.1" min="0" max="100" value={form.commission_percentage} onChange={(e) => setForm({ ...form, commission_percentage: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Cor na Agenda</Label><Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10" /></div>
                <div className="flex items-center gap-2 pt-6"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /><Label>Ativo</Label></div>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Salvando..." : "Salvar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Buscar profissional..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Cargo</TableHead><TableHead>Especialidade</TableHead><TableHead>Comissão</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            : filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum profissional cadastrado</TableCell></TableRow>
            : filtered.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="font-medium">{p.name}</span>
                  </div>
                </TableCell>
                <TableCell>{p.positions?.name || "—"}</TableCell>
                <TableCell>{p.specialty || "—"}</TableCell>
                <TableCell>{Number(p.commission_percentage)}%</TableCell>
                <TableCell>
                  <Badge className={p.active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}>
                    {p.active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Switch checked={p.active} onCheckedChange={(v) => toggleActiveMutation.mutate({ id: p.id, active: v })} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
