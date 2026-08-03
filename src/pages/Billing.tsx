import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle, XCircle, Search, DollarSign } from "lucide-react";

const statusLabels: Record<string, string> = { pending: "Pendente", paid: "Pago", cancelled: "Cancelado" };
const statusVariants: Record<string, "warning" | "success" | "secondary"> = {
  pending: "warning",
  paid: "success",
  cancelled: "secondary",
};

const paymentMethods = [
  { value: "cash", label: "Dinheiro" },
  { value: "credit_card", label: "Cartão de Crédito" },
  { value: "debit_card", label: "Cartão de Débito" },
  { value: "pix", label: "PIX" },
  { value: "transfer", label: "Transferência" },
];

export default function Billing() {
  const { currentClinic } = useClinic();
  const clinicId = currentClinic!.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({ patient_id: "", procedure_id: "", doctor_id: "", billing_date: new Date().toISOString().split("T")[0], amount: "", notes: "" });
  const [payForm, setPayForm] = useState({ payment_method: "pix", amount_paid: "", payment_date: new Date().toISOString().split("T")[0] });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients", clinicId],
    queryFn: async () => { const { data } = await supabase.from("patients").select("id, name").eq("clinic_id", clinicId).order("name"); return data || []; },
  });

  const { data: procedures = [] } = useQuery({
    queryKey: ["procedures", clinicId],
    queryFn: async () => { const { data } = await supabase.from("procedures").select("id, name, suggested_price").eq("clinic_id", clinicId).eq("active", true).order("name"); return data || []; },
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors", clinicId],
    queryFn: async () => { const { data } = await supabase.from("doctors").select("id, name, commission_percentage").eq("clinic_id", clinicId).eq("active", true).order("name"); return data || []; },
  });

  const { data: commissionRules = [] } = useQuery({
    queryKey: ["commission-rules", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("commission_rules").select("*").eq("clinic_id", clinicId);
      return data || [];
    },
  });

  const { data: billings = [], isLoading } = useQuery({
    queryKey: ["billings", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("billings").select("*, patients(name), procedures(name), doctors(name)").eq("clinic_id", clinicId).order("billing_date", { ascending: false });
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(form.amount);
      const { data: billing, error } = await supabase.from("billings").insert({
        clinic_id: clinicId,
        patient_id: form.patient_id || null,
        procedure_id: form.procedure_id || null,
        doctor_id: form.doctor_id || null,
        billing_date: form.billing_date,
        amount,
        notes: form.notes || null,
      }).select().single();
      if (error) throw error;

      // Auto-create commission if doctor selected
      if (form.doctor_id && billing) {
        // Check for specific commission rule first, then use default
        const specificRule = commissionRules.find((r: any) =>
          r.doctor_id === form.doctor_id && r.procedure_id === form.procedure_id
        );
        const doctor = doctors.find((d: any) => d.id === form.doctor_id);
        const pct = specificRule ? Number(specificRule.percentage) : (doctor?.commission_percentage || 0);
        if (pct > 0) {
          await supabase.from("commissions").insert({
            clinic_id: clinicId,
            doctor_id: form.doctor_id,
            billing_id: billing.id,
            procedure_id: form.procedure_id || null,
            procedure_amount: amount,
            commission_percentage: pct,
            commission_amount: (amount * pct) / 100,
            billing_date: form.billing_date,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billings"] });
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      setOpen(false);
      setForm({ patient_id: "", procedure_id: "", doctor_id: "", billing_date: new Date().toISOString().split("T")[0], amount: "", notes: "" });
      toast({ title: "Faturamento registrado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBilling) return;
      const amountPaid = parseFloat(payForm.amount_paid);
      const { error } = await supabase.from("billing_payments").insert({
        clinic_id: clinicId,
        billing_id: selectedBilling.id,
        payment_method: payForm.payment_method,
        amount_paid: amountPaid,
        payment_date: payForm.payment_date,
      });
      if (error) throw error;
      const newTotal = Number(selectedBilling.amount_paid) + amountPaid;
      const newStatus = newTotal >= Number(selectedBilling.amount) ? "paid" : "pending";
      await supabase.from("billings").update({ amount_paid: newTotal, status: newStatus }).eq("id", selectedBilling.id);
      if (newStatus === "paid") {
        await supabase.from("commissions").update({ status: "paid" }).eq("billing_id", selectedBilling.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billings"] });
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      setPayOpen(false);
      setSelectedBilling(null);
      setPayForm({ payment_method: "pix", amount_paid: "", payment_date: new Date().toISOString().split("T")[0] });
      toast({ title: "Pagamento registrado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("billings").update({ status: "cancelled" }).eq("id", id);
      await supabase.from("commissions").update({ status: "cancelled" }).eq("billing_id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billings"] });
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      toast({ title: "Faturamento cancelado!" });
    },
  });

  const handleProcedureChange = (procId: string) => {
    const proc = procedures.find((p: any) => p.id === procId);
    setForm({ ...form, procedure_id: procId, amount: proc?.suggested_price?.toString() || form.amount });
  };

  const filtered = billings.filter((b: any) => {
    const matchSearch = (b.patients?.name || "").toLowerCase().includes(search.toLowerCase()) || (b.procedures?.name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totals = billings.reduce((acc: any, b: any) => {
    if (b.status !== "cancelled") {
      acc.total += Number(b.amount);
      acc.paid += Number(b.amount_paid);
      acc.pending += Number(b.amount) - Number(b.amount_paid);
    }
    return acc;
  }, { total: 0, paid: 0, pending: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Faturamento</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Faturamento</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Novo Faturamento</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Paciente</Label>
                <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{patients.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Procedimento</Label>
                <Select value={form.procedure_id} onValueChange={handleProcedureChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{procedures.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Profissional</Label>
                <Select value={form.doctor_id} onValueChange={(v) => setForm({ ...form, doctor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{doctors.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.billing_date} onChange={(e) => setForm({ ...form, billing_date: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
              </div>
              <div className="space-y-2"><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "Salvando..." : "Registrar Faturamento"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Faturado</p><p className="text-2xl font-bold">{formatCurrency(totals.total)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Recebido</p><p className="text-2xl font-bold text-success">{formatCurrency(totals.paid)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Pendente</p><p className="text-2xl font-bold text-warning">{formatCurrency(totals.pending)}</p></CardContent></Card>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-10" placeholder="Buscar paciente ou procedimento..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="pending">Pendente</SelectItem><SelectItem value="paid">Pago</SelectItem><SelectItem value="cancelled">Cancelado</SelectItem></SelectContent>
        </Select>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Paciente</TableHead><TableHead>Procedimento</TableHead><TableHead>Profissional</TableHead><TableHead>Valor</TableHead><TableHead>Pago</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            : filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum faturamento encontrado</TableCell></TableRow>
            : filtered.map((b: any) => (
              <TableRow key={b.id}>
                <TableCell>{formatDate(b.billing_date)}</TableCell>
                <TableCell>{b.patients?.name || "—"}</TableCell>
                <TableCell>{b.procedures?.name || "—"}</TableCell>
                <TableCell>{b.doctors?.name || "—"}</TableCell>
                <TableCell>{formatCurrency(Number(b.amount))}</TableCell>
                <TableCell>{formatCurrency(Number(b.amount_paid))}</TableCell>
                <TableCell><Badge variant={statusVariants[b.status] || "secondary"}>{statusLabels[b.status] || b.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {b.status === "pending" && (
                      <>
                        <Button variant="ghost" size="icon" title="Registrar pagamento" onClick={() => { setSelectedBilling(b); setPayForm({ ...payForm, amount_paid: (Number(b.amount) - Number(b.amount_paid)).toString() }); setPayOpen(true); }}><DollarSign className="h-4 w-4 text-success" /></Button>
                        <Button variant="ghost" size="icon" title="Cancelar" onClick={() => cancelMutation.mutate(b.id)}><XCircle className="h-4 w-4 text-destructive" /></Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      {/* Payment dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
          {selectedBilling && (
            <div className="mb-4 p-3 bg-muted rounded-md text-sm space-y-1">
              <p><strong>Paciente:</strong> {selectedBilling.patients?.name}</p>
              <p><strong>Valor total:</strong> {formatCurrency(Number(selectedBilling.amount))}</p>
              <p><strong>Já pago:</strong> {formatCurrency(Number(selectedBilling.amount_paid))}</p>
              <p><strong>Restante:</strong> {formatCurrency(Number(selectedBilling.amount) - Number(selectedBilling.amount_paid))}</p>
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); payMutation.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={payForm.payment_method} onValueChange={(v) => setPayForm({ ...payForm, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{paymentMethods.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Valor Pago (R$)</Label><Input type="number" step="0.01" value={payForm.amount_paid} onChange={(e) => setPayForm({ ...payForm, amount_paid: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Data</Label><Input type="date" value={payForm.payment_date} onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })} required /></div>
            </div>
            <Button type="submit" className="w-full" disabled={payMutation.isPending}>{payMutation.isPending ? "Registrando..." : "Registrar Pagamento"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
