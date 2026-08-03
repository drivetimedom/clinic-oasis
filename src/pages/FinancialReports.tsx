import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { formatCurrency } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function FinancialReports() {
  const { currentClinic } = useClinic();
  const clinicId = currentClinic!.id;
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);

  const { data: billings = [] } = useQuery({
    queryKey: ["billings-report", clinicId, startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase.from("billings").select("*, doctors(name), procedures(name)")
        .eq("clinic_id", clinicId)
        .gte("billing_date", startDate)
        .lte("billing_date", endDate)
        .neq("status", "cancelled")
        .order("billing_date");
      return data || [];
    },
  });

  const totals = billings.reduce((acc: any, b: any) => {
    acc.total += Number(b.amount);
    acc.paid += Number(b.amount_paid);
    acc.pending += Number(b.amount) - Number(b.amount_paid);
    return acc;
  }, { total: 0, paid: 0, pending: 0 });

  // Group by doctor
  const byDoctor = billings.reduce((acc: Record<string, { name: string; total: number; count: number }>, b: any) => {
    const name = b.doctors?.name || "Sem profissional";
    if (!acc[name]) acc[name] = { name, total: 0, count: 0 };
    acc[name].total += Number(b.amount);
    acc[name].count += 1;
    return acc;
  }, {});
  const doctorData = Object.values(byDoctor).sort((a: any, b: any) => b.total - a.total);

  // Group by procedure
  const byProcedure = billings.reduce((acc: Record<string, { name: string; total: number; count: number }>, b: any) => {
    const name = b.procedures?.name || "Sem procedimento";
    if (!acc[name]) acc[name] = { name, total: 0, count: 0 };
    acc[name].total += Number(b.amount);
    acc[name].count += 1;
    return acc;
  }, {});
  const procedureData = Object.values(byProcedure).sort((a: any, b: any) => b.total - a.total);

  return (
    <div className="space-y-6">
      <h1 className="page-title">Relatórios Financeiros</h1>

      <div className="flex gap-4 items-end flex-wrap">
        <div className="space-y-1"><Label>Data inicial</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
        <div className="space-y-1"><Label>Data final</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Faturado</p><p className="text-2xl font-bold">{formatCurrency(totals.total)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Recebido</p><p className="text-2xl font-bold text-success">{formatCurrency(totals.paid)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Pendente</p><p className="text-2xl font-bold text-warning">{formatCurrency(totals.pending)}</p></CardContent></Card>
      </div>

      {/* Chart */}
      {doctorData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Faturamento por Profissional</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={doctorData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Por Profissional</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Profissional</TableHead><TableHead>Atendimentos</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {doctorData.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">Sem dados</TableCell></TableRow>
                : doctorData.map((d: any) => (
                  <TableRow key={d.name}><TableCell className="font-medium">{d.name}</TableCell><TableCell>{d.count}</TableCell><TableCell>{formatCurrency(d.total)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Por Procedimento</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Procedimento</TableHead><TableHead>Qtd</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {procedureData.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">Sem dados</TableCell></TableRow>
                : procedureData.map((p: any) => (
                  <TableRow key={p.name}><TableCell className="font-medium">{p.name}</TableCell><TableCell>{p.count}</TableCell><TableCell>{formatCurrency(p.total)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
