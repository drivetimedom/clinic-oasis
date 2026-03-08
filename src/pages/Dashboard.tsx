import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownCircle, ArrowUpCircle, DollarSign, AlertTriangle, Users, CalendarCheck, TrendingUp, UserPlus, Repeat, Syringe, Stethoscope } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subDays, isAfter, isBefore, addDays, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function Dashboard() {
  const { currentClinic } = useClinic();
  const clinicId = currentClinic!.id;

  // --- Existing financial queries ---
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

  // --- Strategic queries ---
  const { data: billings = [] } = useQuery({
    queryKey: ["dashboard-billings", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("billings").select("*, procedures(name), doctors(name)").eq("clinic_id", clinicId);
      return data || [];
    },
  });

  const { data: patientProcedures = [] } = useQuery({
    queryKey: ["dashboard-patient-procedures", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("patient_procedures").select("*, procedures(name), doctors(name)").eq("clinic_id", clinicId);
      return data || [];
    },
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["dashboard-patients", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("patients").select("id, name, created_at").eq("clinic_id", clinicId);
      return data || [];
    },
  });

  // --- Financial metrics (existing) ---
  const totalReceivable = receivables.filter(r => r.status === "pending").reduce((s, r) => s + Number(r.amount), 0);
  const totalPayable = payables.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);
  const totalReceived = receivables.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.amount), 0);
  const totalPaid = payables.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const balance = totalReceived - totalPaid;

  const today = new Date();
  const upcomingDue = [
    ...receivables.filter(r => r.status === "pending" && isAfter(new Date(r.due_date), today) && isBefore(new Date(r.due_date), addDays(today, 7))),
    ...payables.filter(p => p.status === "pending" && isAfter(new Date(p.due_date), today) && isBefore(new Date(p.due_date), addDays(today, 7))),
  ];

  // --- Strategic metrics ---
  const monthStart = startOfMonth(today).toISOString().split("T")[0];

  const monthBillings = billings.filter(b => b.billing_date >= monthStart);
  const monthRevenue = monthBillings.reduce((s, b) => s + Number(b.amount), 0);

  const monthProcedures = patientProcedures.filter(p => p.procedure_date >= monthStart);
  const monthAppointments = monthProcedures.length;

  const newPatientsMonth = patients.filter(p => p.created_at >= monthStart + "T00:00:00").length;

  // Recurring patients: patients with 2+ procedures
  const patientProcCount: Record<string, number> = {};
  patientProcedures.forEach(p => { patientProcCount[p.patient_id] = (patientProcCount[p.patient_id] || 0) + 1; });
  const totalWithProcs = Object.keys(patientProcCount).length;
  const recurringCount = Object.values(patientProcCount).filter(c => c >= 2).length;
  const recurringPct = totalWithProcs > 0 ? Math.round((recurringCount / totalWithProcs) * 100) : 0;

  // --- Charts: monthly data (last 6 months) ---
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const m = subMonths(today, 5 - i);
    const mStart = format(startOfMonth(m), "yyyy-MM-dd");
    const mEnd = format(startOfMonth(subMonths(m, -1)), "yyyy-MM-dd");
    const label = format(m, "MMM/yy", { locale: ptBR });

    const revenue = billings.filter(b => b.billing_date >= mStart && b.billing_date < mEnd).reduce((s, b) => s + Number(b.amount), 0);
    const appointments = patientProcedures.filter(p => p.procedure_date >= mStart && p.procedure_date < mEnd).length;
    const newPatients = patients.filter(p => p.created_at >= mStart + "T00:00:00" && p.created_at < mEnd + "T00:00:00").length;

    return { month: label, faturamento: revenue, atendimentos: appointments, novosPacientes: newPatients };
  });

  // --- Top procedures ---
  const procStats: Record<string, { name: string; count: number; revenue: number }> = {};
  patientProcedures.forEach(p => {
    const name = (p.procedures as any)?.name || "—";
    const pid = p.procedure_id || "none";
    if (!procStats[pid]) procStats[pid] = { name, count: 0, revenue: 0 };
    procStats[pid].count++;
  });
  billings.forEach(b => {
    const pid = b.procedure_id || "none";
    if (procStats[pid]) procStats[pid].revenue += Number(b.amount);
  });
  const topProcedures = Object.values(procStats).sort((a, b) => b.count - a.count).slice(0, 5);

  // --- Top professionals ---
  const docStats: Record<string, { name: string; count: number; revenue: number }> = {};
  patientProcedures.forEach(p => {
    const name = (p.doctors as any)?.name || "—";
    const did = p.doctor_id || "none";
    if (!docStats[did]) docStats[did] = { name, count: 0, revenue: 0 };
    docStats[did].count++;
  });
  billings.forEach(b => {
    const did = b.doctor_id || "none";
    if (docStats[did]) docStats[did].revenue += Number(b.amount);
  });
  const topDoctors = Object.values(docStats).sort((a, b) => b.count - a.count).slice(0, 5);

  // --- Financial chart (existing) ---
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(today, 29 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayReceived = receivables.filter(r => r.payment_date === dateStr).reduce((s, r) => s + Number(r.amount), 0);
    const dayPaid = payables.filter(p => p.payment_date === dateStr).reduce((s, p) => s + Number(p.amount), 0);
    return { date: format(date, "dd/MM"), receitas: dayReceived, despesas: dayPaid };
  });

  const financialMetrics = [
    { title: "A Receber", value: formatCurrency(totalReceivable), icon: ArrowDownCircle, color: "text-emerald-500" },
    { title: "A Pagar", value: formatCurrency(totalPayable), icon: ArrowUpCircle, color: "text-destructive" },
    { title: "Saldo", value: formatCurrency(balance), icon: DollarSign, color: balance >= 0 ? "text-emerald-500" : "text-destructive" },
    { title: "Vencendo em 7d", value: String(upcomingDue.length), icon: AlertTriangle, color: upcomingDue.length > 0 ? "text-yellow-500" : "text-muted-foreground" },
  ];

  const strategicMetrics = [
    { title: "Faturamento do Mês", value: formatCurrency(monthRevenue), icon: TrendingUp, color: "text-emerald-500" },
    { title: "Atendimentos do Mês", value: String(monthAppointments), icon: CalendarCheck, color: "text-primary" },
    { title: "Novos Pacientes", value: String(newPatientsMonth), icon: UserPlus, color: "text-blue-500" },
    { title: "Pacientes Recorrentes", value: `${recurringPct}%`, icon: Repeat, color: "text-purple-500" },
  ];

  const tooltipStyle = { backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard da Clínica</h1>

      {/* Strategic KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {strategicMetrics.map((m) => (
          <Card key={m.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{m.title}</CardTitle>
              <m.icon className={`h-5 w-5 ${m.color}`} />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{m.value}</p></CardContent>
          </Card>
        ))}
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {financialMetrics.map((m) => (
          <Card key={m.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{m.title}</CardTitle>
              <m.icon className={`h-5 w-5 ${m.color}`} />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{m.value}</p></CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by month */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Faturamento por Mês</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="faturamento" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Faturamento" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Appointments & new patients by month */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Atendimentos e Novos Pacientes</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="atendimentos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Atendimentos" />
                  <Bar dataKey="novosPacientes" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} name="Novos Pacientes" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial evolution chart */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Evolução Financeira (30 dias)</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Area type="monotone" dataKey="receitas" stroke="hsl(142 69% 58%)" fill="hsl(142 69% 58% / 0.2)" name="Receitas" />
                <Area type="monotone" dataKey="despesas" stroke="hsl(0 84% 60%)" fill="hsl(0 84% 60% / 0.2)" name="Despesas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Rankings row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top procedures */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Syringe className="h-5 w-5 text-primary" />
              Procedimentos Mais Realizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProcedures.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Sem dados.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Procedimento</TableHead>
                    <TableHead className="text-center">Atendimentos</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProcedures.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-center"><Badge variant="secondary">{p.count}</Badge></TableCell>
                      <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top professionals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Stethoscope className="h-5 w-5 text-primary" />
              Desempenho por Profissional
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topDoctors.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Sem dados.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profissional</TableHead>
                    <TableHead className="text-center">Atendimentos</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topDoctors.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-center"><Badge variant="secondary">{d.count}</Badge></TableCell>
                      <TableCell className="text-right">{formatCurrency(d.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recurring patients card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Repeat className="h-5 w-5 text-primary" />
            Taxa de Recorrência de Pacientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pacientes que retornaram (2+ procedimentos)</span>
              <span className="font-bold text-lg">{recurringPct}%</span>
            </div>
            <Progress value={recurringPct} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{recurringCount} recorrentes</span>
              <span>{totalWithProcs} total com procedimentos</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
