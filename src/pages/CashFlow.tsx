import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, eachDayOfInterval, subDays } from "date-fns";
import { Plus } from "lucide-react";

export default function CashFlow() {
  const { currentClinic } = useClinic();
  const { user } = useAuth();
  const clinicId = currentClinic!.id;
  const today = new Date();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: "entrada" as "entrada" | "saida",
    description: "",
    amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
    responsible: "",
  });

  const { data: receivables = [] } = useQuery({
    queryKey: ["receivables", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("receivables").select("*").eq("clinic_id", clinicId);
      return data || [];
    },
  });

  const { data: payables = [] } = useQuery({
    queryKey: ["payables", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("payables").select("*").eq("clinic_id", clinicId);
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(form.amount);
      if (!amount || !form.description) throw new Error("Preencha todos os campos obrigatórios");

      if (form.type === "entrada") {
        const { error } = await supabase.from("receivables").insert({
          clinic_id: clinicId,
          user_id: user!.id,
          description: form.description,
          amount,
          due_date: form.date,
          payment_date: form.date,
          status: "paid",
          category: "other",
          notes: form.responsible ? `Responsável: ${form.responsible}` : null,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payables").insert({
          clinic_id: clinicId,
          user_id: user!.id,
          description: form.description,
          amount,
          due_date: form.date,
          payment_date: form.date,
          status: "paid",
          category: "other",
          notes: form.responsible ? `Responsável: ${form.responsible}` : null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      queryClient.invalidateQueries({ queryKey: ["payables"] });
      setOpen(false);
      setForm({ type: "entrada", description: "", amount: "", date: format(new Date(), "yyyy-MM-dd"), responsible: "" });
      toast({ title: "Movimento registrado com sucesso!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const days = eachDayOfInterval({ start: subDays(today, 29), end: today });
  const chartData = days.map((day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const entradas = receivables.filter(r => r.payment_date === dateStr).reduce((s, r) => s + Number(r.amount), 0);
    const saidas = payables.filter(p => p.payment_date === dateStr).reduce((s, p) => s + Number(p.amount), 0);
    return { date: format(day, "dd/MM"), entradas, saidas, saldo: entradas - saidas };
  });

  const allTransactions = [
    ...receivables.filter(r => r.status === "paid").map(r => ({ date: r.payment_date!, description: r.description, type: "entrada" as const, amount: Number(r.amount) })),
    ...payables.filter(p => p.status === "paid").map(p => ({ date: p.payment_date!, description: p.description, type: "saida" as const, amount: Number(p.amount) })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Fluxo de Caixa</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2"><Plus className="h-5 w-5" />Registrar Movimento de Caixa</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Registrar Movimento de Caixa</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Movimentação</Label>
                <Select value={form.type} onValueChange={(v: "entrada" | "saida") => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required placeholder="Ex: Pagamento de consulta" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Input value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} placeholder="Nome do responsável" />
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Registrar Movimento"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Fluxo Diário (30 dias)</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="fill-muted-foreground" fontSize={12} />
                <YAxis className="fill-muted-foreground" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                <Legend />
                <Bar dataKey="entradas" name="Entradas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saidas" name="Saídas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-lg">Movimentações Recentes</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
            <TableBody>
              {allTransactions.length === 0
                ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma movimentação encontrada</TableCell></TableRow>
                : allTransactions.map((t, i) => (
                  <TableRow key={i}>
                    <TableCell>{formatDate(t.date)}</TableCell>
                    <TableCell>{t.description}</TableCell>
                    <TableCell><span className={t.type === "entrada" ? "text-[hsl(var(--success))]" : "text-destructive"}>{t.type === "entrada" ? "Entrada" : "Saída"}</span></TableCell>
                    <TableCell className={`text-right font-medium ${t.type === "entrada" ? "text-[hsl(var(--success))]" : "text-destructive"}`}>{t.type === "entrada" ? "+" : "-"}{formatCurrency(t.amount)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
