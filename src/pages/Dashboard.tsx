import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, CalendarCheck, UserPlus, Repeat, ArrowDownCircle, ArrowUpCircle, DollarSign, AlertTriangle, Syringe, Stethoscope, ArrowUp } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subDays, isAfter, isBefore, addDays, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function Dashboard() {
  const { currentClinic } = useClinic();
  const clinicId = currentClinic!.id;

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

  // Financial metrics
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

  // Strategic metrics
  const monthStart = startOfMonth(today).toISOString().split("T")[0];
  const monthBillings = billings.filter(b => b.billing_date >= monthStart);
  const monthRevenue = monthBillings.reduce((s, b) => s + Number(b.amount), 0);
  const monthProcedures = patientProcedures.filter(p => p.procedure_date >= monthStart);
  const monthAppointments = monthProcedures.length;
  const newPatientsMonth = patients.filter(p => p.created_at >= monthStart + "T00:00:00").length;

  const patientProcCount: Record<string, number> = {};
  patientProcedures.forEach(p => { patientProcCount[p.patient_id] = (patientProcCount[p.patient_id] || 0) + 1; });
  const totalWithProcs = Object.keys(patientProcCount).length;
  const recurringCount = Object.values(patientProcCount).filter(c => c >= 2).length;
  const recurringPct = totalWithProcs > 0 ? Math.round((recurringCount / totalWithProcs) * 100) : 0;

  // Charts
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

  // Top procedures
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

  // Top professionals
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

  // Financial chart
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(today, 29 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayReceived = receivables.filter(r => r.payment_date === dateStr).reduce((s, r) => s + Number(r.amount), 0);
    const dayPaid = payables.filter(p => p.payment_date === dateStr).reduce((s, p) => s + Number(p.amount), 0);
    return { date: format(date, "dd/MM"), receitas: dayReceived, despesas: dayPaid };
  });

  const tooltipStyle = {
    backgroundColor: "hsl(240 8% 9%)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    padding: "10px 12px",
    fontSize: 12.5,
    boxShadow: "0 18px 45px -18px rgba(0,0,0,0.7)",
    color: "#fff",
  };

  const axisStyle = { fill: "rgba(255,255,255,0.42)", fontSize: 11.5 };
  const gridStroke = "rgba(255,255,255,0.045)";

  const strategicMetrics = [
    { title: "Faturamento do Mês", value: formatCurrency(monthRevenue), icon: TrendingUp, iconBg: "bg-primary/10", iconColor: "text-primary" },
    { title: "Atendimentos do Mês", value: String(monthAppointments), icon: CalendarCheck, iconBg: "bg-info/10", iconColor: "text-muted-foreground" },
    { title: "Novos Pacientes", value: String(newPatientsMonth), icon: UserPlus, iconBg: "bg-info/10", iconColor: "text-muted-foreground" },
    { title: "Recorrência", value: `${recurringPct}%`, icon: Repeat, iconBg: "bg-primary/10", iconColor: "text-primary" },
  ];

  const financialMetrics = [
    { title: "A Receber", value: formatCurrency(totalReceivable), icon: ArrowDownCircle, iconBg: "bg-primary/10", iconColor: "text-primary" },
    { title: "A Pagar", value: formatCurrency(totalPayable), icon: ArrowUpCircle, iconBg: "bg-destructive/10", iconColor: "text-destructive" },
    { title: "Saldo", value: formatCurrency(balance), icon: DollarSign, iconBg: balance >= 0 ? "bg-primary/10" : "bg-destructive/10", iconColor: balance >= 0 ? "text-primary" : "text-destructive" },
    { title: "Vencendo em 7d", value: String(upcomingDue.length), icon: AlertTriangle, iconBg: upcomingDue.length > 0 ? "bg-warning/10" : "bg-muted", iconColor: upcomingDue.length > 0 ? "text-warning" : "text-muted-foreground" },
  ];

  const renderMetricCard = (m: typeof strategicMetrics[0]) => (
    <Card key={m.title} className="group">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[12.5px] font-medium text-muted-foreground">{m.title}</p>
          <m.icon className={`w-4 h-4 ${m.iconColor} opacity-70`} />
        </div>
        <p className="num text-[28px] font-semibold text-foreground tracking-[-0.03em] leading-none">
          {m.value}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="page-title">Dashboard</h1>
        <p className="text-caption">Visão geral da operação da clínica</p>
      </div>

      {/* Strategic KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {strategicMetrics.map(renderMetricCard)}
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {financialMetrics.map(renderMetricCard)}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Faturamento por Mês</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="faturamento" fill="hsl(25 100% 55%)" radius={[4, 4, 0, 0]} name="Faturamento" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Atendimentos e Novos Pacientes</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }} />
                  <Bar dataKey="atendimentos" fill="hsl(25 100% 55%)" radius={[4, 4, 0, 0]} name="Atendimentos" />
                  <Bar dataKey="novosPacientes" fill="hsl(240 5% 45%)" radius={[4, 4, 0, 0]} name="Novos Pacientes" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial evolution */}
      <Card>
        <CardHeader><CardTitle>Evolução Financeira — 30 dias</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(25 100% 55%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(25 100% 55%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0 72% 55%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(0 72% 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }} />
                <Area type="monotone" dataKey="receitas" stroke="hsl(25 100% 55%)" strokeWidth={2} fill="url(#colorReceitas)" name="Receitas" dot={false} />
                <Area type="monotone" dataKey="despesas" stroke="hsl(0 72% 55%)" strokeWidth={2} fill="url(#colorDespesas)" name="Despesas" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Syringe className="h-4 w-4 text-subtle" />
              Procedimentos Mais Realizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProcedures.length === 0 ? (
              <p className="text-muted-foreground text-[13px] text-center py-6">Nenhum dado disponível</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Procedimento</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProcedures.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-center"><Badge variant="secondary">{p.count}</Badge></TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(p.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-subtle" />
              Desempenho por Profissional
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topDoctors.length === 0 ? (
              <p className="text-muted-foreground text-[13px] text-center py-6">Nenhum dado disponível</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profissional</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topDoctors.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-center"><Badge variant="secondary">{d.count}</Badge></TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(d.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recurring patients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-subtle" />
            Taxa de Recorrência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">Pacientes que retornaram (2+ procedimentos)</span>
              <span className="num text-[28px] font-semibold tracking-[-0.03em]">{recurringPct}%</span>
            </div>
            <Progress value={recurringPct} className="h-2" />
            <div className="flex justify-between text-[13px] text-muted-foreground">
              <span>{recurringCount} recorrentes</span>
              <span>{totalWithProcs} total</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
