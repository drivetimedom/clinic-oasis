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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Eye, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const emptyForm = {
  name: "", email: "", phone: "", cpf: "", birth_date: "", gender: "",
  address: "", city: "", state: "", zip_code: "", notes: "",
};

export default function Patients() {
  const { user } = useAuth();
  const { currentClinic } = useClinic();
  const clinicId = currentClinic!.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["patients", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("patients").select("*").eq("clinic_id", clinicId).order("name");
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("patients").insert({
        user_id: user!.id, clinic_id: clinicId, name: form.name,
        email: form.email || null, phone: form.phone || null, cpf: form.cpf || null,
        birth_date: form.birth_date || null, gender: form.gender || null,
        address: form.address || null, city: form.city || null, state: form.state || null,
        zip_code: form.zip_code || null, notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setOpen(false); setForm(emptyForm);
      toast({ title: "Paciente cadastrado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("patients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["patients"] }); toast({ title: "Paciente removido!" }); },
  });

  const filtered = patients.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase()) || p.phone?.includes(search));
  const updateField = (field: string, value: string) => setForm({ ...form, [field]: value });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pacientes</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Paciente</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Novo Paciente</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2"><Label>Nome *</Label><Input value={form.name} onChange={(e) => updateField("name", e.target.value)} required /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} /></div>
                <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="(11) 99999-9999" /></div>
                <div className="space-y-2"><Label>CPF</Label><Input value={form.cpf} onChange={(e) => updateField("cpf", e.target.value)} placeholder="000.000.000-00" /></div>
                <div className="space-y-2"><Label>Data de Nascimento</Label><Input type="date" value={form.birth_date} onChange={(e) => updateField("birth_date", e.target.value)} /></div>
                <div className="space-y-2"><Label>Gênero</Label>
                  <Select value={form.gender} onValueChange={(v) => updateField("gender", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent><SelectItem value="female">Feminino</SelectItem><SelectItem value="male">Masculino</SelectItem><SelectItem value="other">Outro</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>CEP</Label><Input value={form.zip_code} onChange={(e) => updateField("zip_code", e.target.value)} /></div>
                <div className="space-y-2 col-span-2"><Label>Endereço</Label><Input value={form.address} onChange={(e) => updateField("address", e.target.value)} /></div>
                <div className="space-y-2"><Label>Cidade</Label><Input value={form.city} onChange={(e) => updateField("city", e.target.value)} /></div>
                <div className="space-y-2"><Label>Estado</Label><Input value={form.state} onChange={(e) => updateField("state", e.target.value)} /></div>
                <div className="space-y-2 col-span-2"><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} rows={3} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "Salvando..." : "Cadastrar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-10" placeholder="Buscar por nome, email ou telefone..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Telefone</TableHead><TableHead>Cadastro</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            : filtered.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum paciente encontrado</TableCell></TableRow>
            : filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.email || "—"}</TableCell>
                <TableCell>{p.phone || "—"}</TableCell>
                <TableCell>{formatDate(p.created_at)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/patients/${p.id}`)} title="Ver ficha"><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)} title="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
