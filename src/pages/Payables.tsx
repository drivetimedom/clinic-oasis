import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClinic } from "@/contexts/ClinicContext";
import { formatCurrency, formatDate, getStatusLabel, getStatusColor, getRecurrenceLabel } from "@/lib/format";
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
import { Plus, CheckCircle, Trash2, Search, RefreshCw } from "lucide-react";

const categories = [
  { value: "general", label: "Geral" },
  { value: "rent", label: "Aluguel" },
  { value: "salary", label: "Salário" },
  { value: "supplies", label: "Insumos" },
  { value: "utilities", label: "Utilidades" },
  { value: "marketing", label: "Marketing" },
  { value: "other", label: "Outro" },
];

export default function Payables() {
  const { user } = useAuth();
  const { currentClinic } = useClinic();
  const clinicId = currentClinic!.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({
    description: "", amount: "", due_date: "", category: "general", supplier: "",
    is_recurring: false, recurrence_type: "monthly" as string, payment_method: "", notes: "",
  });

  const { data: payables = [], isLoading } = useQuery({
    queryKey: ["payables", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("payables").select("*").eq("clinic_id", clinicId).order("due_date", { ascending: false });
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("payables").insert({
        user_id: user!.id, clinic_id: clinicId,
        description: form.description, amount: parseFloat(form.amount), due_date: form.due_date,
        category: form.category, supplier: form.supplier || null,
        is_recurring: form.is_recurring, recurrence_type: form.is_recurring ? form.recurrence_type : null,
        payment_method: form.payment_method || null, notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payables"] });
      setOpen(false);
      setForm({ description: "", amount: "", due_date: "", category: "general", supplier: "", is_recurring: false, recurrence_type: "monthly", payment_method: "", notes: "" });
      toast({ title: "Conta a pagar criada!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payables").update({ status: "paid", payment_date: new Date().toISOString().split("T")[0] }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["payables"] }); toast({ title: "Marcado como pago!" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payables").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["payables"] }); toast({ title: "Removido!" }); },
  });

  const filtered = payables.filter((p) => {
    const matchSearch = p.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Contas a Pagar</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova Conta</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Conta a Pagar</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2"><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Vencimento</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Categoria</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Fornecedor</Label><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2"><Switch checked={form.is_recurring} onCheckedChange={(v) => setForm({ ...form, is_recurring: v })} /><Label>Recorrente</Label></div>
                {form.is_recurring && (
                  <Select value={form.recurrence_type} onValueChange={(v) => setForm({ ...form, recurrence_type: v })}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="monthly">Mensal</SelectItem><SelectItem value="quarterly">Trimestral</SelectItem><SelectItem value="semiannual">Semestral</SelectItem><SelectItem value="annual">Anual</SelectItem></SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2"><Label>Método de Pagamento</Label><Input value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} placeholder="Pix, Boleto..." /></div>
              <div className="space-y-2"><Label>Observações</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "Salvando..." : "Salvar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-10" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="pending">Pendente</SelectItem><SelectItem value="paid">Pago</SelectItem><SelectItem value="overdue">Vencido</SelectItem></SelectContent>
        </Select>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Valor</TableHead><TableHead>Vencimento</TableHead><TableHead>Categoria</TableHead><TableHead>Status</TableHead><TableHead>Recorrência</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            : filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma conta encontrada</TableCell></TableRow>
            : filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.description}</TableCell>
                <TableCell>{formatCurrency(Number(p.amount))}</TableCell>
                <TableCell>{formatDate(p.due_date)}</TableCell>
                <TableCell>{categories.find(c => c.value === p.category)?.label || p.category}</TableCell>
                <TableCell><Badge className={getStatusColor(p.status)}>{getStatusLabel(p.status)}</Badge></TableCell>
                <TableCell>{p.is_recurring && <Badge variant="outline" className="gap-1"><RefreshCw className="h-3 w-3" />{getRecurrenceLabel(p.recurrence_type)}</Badge>}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {p.status === "pending" && <Button variant="ghost" size="icon" onClick={() => markPaidMutation.mutate(p.id)} title="Marcar como pago"><CheckCircle className="h-4 w-4 text-success" /></Button>}
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
