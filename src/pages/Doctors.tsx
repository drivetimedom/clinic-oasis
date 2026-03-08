import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClinic } from "@/contexts/ClinicContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Stethoscope } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function Doctors() {
  const { user } = useAuth();
  const { currentClinic } = useClinic();
  const clinicId = currentClinic!.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", specialty: "", phone: "", email: "", color: "#4ade80" });

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ["doctors", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("doctors").select("*").eq("clinic_id", clinicId).order("name");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from("doctors").update({
          name: form.name, specialty: form.specialty || null,
          phone: form.phone || null, email: form.email || null, color: form.color,
        }).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("doctors").insert({
          user_id: user!.id, clinic_id: clinicId, name: form.name,
          specialty: form.specialty || null, phone: form.phone || null,
          email: form.email || null, color: form.color,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      setOpen(false); setEditId(null);
      setForm({ name: "", specialty: "", phone: "", email: "", color: "#4ade80" });
      toast({ title: editId ? "Doutora atualizada!" : "Doutora cadastrada!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("doctors").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctors"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("doctors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["doctors"] }); toast({ title: "Doutora removida!" }); },
  });

  const openEdit = (d: any) => { setEditId(d.id); setForm({ name: d.name, specialty: d.specialty || "", phone: d.phone || "", email: d.email || "", color: d.color }); setOpen(true); };
  const openNew = () => { setEditId(null); setForm({ name: "", specialty: "", phone: "", email: "", color: "#4ade80" }); setOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Doutoras</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nova Doutora</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Editar Doutora" : "Nova Doutora"}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2"><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Especialidade</Label><Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="Ex: Dermatologia" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Cor na agenda</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-14 rounded cursor-pointer border border-border bg-transparent" />
                  <span className="text-sm text-muted-foreground">{form.color}</span>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Salvando..." : "Salvar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Cor</TableHead><TableHead>Nome</TableHead><TableHead>Especialidade</TableHead><TableHead>Contato</TableHead><TableHead>Ativa</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            : doctors.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground"><div className="flex flex-col items-center gap-2"><Stethoscope className="h-8 w-8 text-muted-foreground/50" /><span>Nenhuma doutora cadastrada</span></div></TableCell></TableRow>
            : doctors.map((d) => (
              <TableRow key={d.id} className={!d.active ? "opacity-50" : ""}>
                <TableCell><div className="h-5 w-5 rounded-full" style={{ backgroundColor: d.color }} /></TableCell>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell>{d.specialty || "—"}</TableCell>
                <TableCell className="text-sm">{d.phone || d.email || "—"}</TableCell>
                <TableCell><Switch checked={d.active} onCheckedChange={(v) => toggleMutation.mutate({ id: d.id, active: v })} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
