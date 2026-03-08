import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

export default function CommissionConfig() {
  const { currentClinic } = useClinic();
  const clinicId = currentClinic!.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ doctor_id: "", procedure_id: "", percentage: "" });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("doctors").select("id, name, commission_percentage").eq("clinic_id", clinicId).eq("active", true).order("name");
      return data || [];
    },
  });

  const { data: procedures = [] } = useQuery({
    queryKey: ["procedures", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("procedures").select("id, name").eq("clinic_id", clinicId).eq("active", true).order("name");
      return data || [];
    },
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["commission-rules", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("commission_rules").select("*, doctors(name), procedures(name)").eq("clinic_id", clinicId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("commission_rules").insert({
        clinic_id: clinicId,
        doctor_id: form.doctor_id,
        procedure_id: form.procedure_id || null,
        percentage: parseFloat(form.percentage),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commission-rules"] });
      setOpen(false);
      setForm({ doctor_id: "", procedure_id: "", percentage: "" });
      toast({ title: "Regra de comissão criada!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("commission_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commission-rules"] });
      toast({ title: "Regra removida!" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Configuração de Comissões</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova Regra</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Regra de Comissão</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Profissional</Label>
                <Select value={form.doctor_id} onValueChange={(v) => setForm({ ...form, doctor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{doctors.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name} ({Number(d.commission_percentage)}% padrão)</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Procedimento (específico)</Label>
                <Select value={form.procedure_id} onValueChange={(v) => setForm({ ...form, procedure_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{procedures.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Percentual de Comissão (%)</Label><Input type="number" step="0.1" min="0" max="100" value={form.percentage} onChange={(e) => setForm({ ...form, percentage: e.target.value })} required /></div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Salvando..." : "Salvar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Como funciona</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• Cada profissional possui uma <strong>comissão padrão</strong> definida no cadastro.</p>
          <p>• Aqui você pode criar <strong>regras específicas por procedimento</strong> que sobrescrevem a comissão padrão.</p>
          <p>• Ao registrar um faturamento, o sistema usará a regra específica (se existir) ou a comissão padrão.</p>
        </CardContent>
      </Card>

      {/* Default commissions summary */}
      <Card>
        <CardHeader><CardTitle className="text-base">Comissão Padrão por Profissional</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Profissional</TableHead><TableHead>Comissão Padrão</TableHead></TableRow></TableHeader>
            <TableBody>
              {doctors.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>{Number(d.commission_percentage)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Specific rules */}
      <Card>
        <CardHeader><CardTitle className="text-base">Regras Específicas por Procedimento</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Profissional</TableHead><TableHead>Procedimento</TableHead><TableHead>Comissão</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              : rules.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma regra específica cadastrada</TableCell></TableRow>
              : rules.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.doctors?.name || "—"}</TableCell>
                  <TableCell>{r.procedures?.name || "Todos"}</TableCell>
                  <TableCell>{Number(r.percentage)}%</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
