import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Users, Stethoscope, DollarSign, Activity, Ban, UserCheck } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import { format, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

function buildMonthlyData(items: { created_at: string }[], months = 6) {
  const buckets: Record<string, number> = {};
  for (let i = months - 1; i >= 0; i--) {
    const key = format(subMonths(new Date(), i), "yyyy-MM");
    buckets[key] = 0;
  }
  items.forEach((item) => {
    const key = format(parseISO(item.created_at), "yyyy-MM");
    if (key in buckets) buckets[key]++;
  });
  return Object.entries(buckets).map(([month, count]) => ({
    month: format(parseISO(month + "-01"), "MMM", { locale: ptBR }),
    count,
  }));
}

const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(0 0% 10%)",
    border: "1px solid hsl(0 0% 18%)",
    borderRadius: "8px",
    color: "hsl(0 0% 95%)",
    fontSize: 12,
  },
};

export default function AdminDashboard() {
  const { data: clinics = [] } = useQuery({
    queryKey: ["admin_clinics"],
    queryFn: async () => {
      const { data } = await supabase.from("clinics").select("id, name, status, created_at");
      return data || [];
    },
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["admin_patients_all"],
    queryFn: async () => {
      const { data } = await supabase.from("patients").select("id, created_at");
      return data || [];
    },
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["admin_appointments_all"],
    queryFn: async () => {
      const { data } = await supabase.from("appointments").select("id, created_at");
      return data || [];
    },
  });

  const { data: revenueByClinic = [] } = useQuery({
    queryKey: ["admin_revenue_by_clinic"],
    queryFn: async () => {
      const { data } = await supabase
        .from("receivables")
        .select("amount, clinic_id, clinics(name)")
        .eq("status", "paid");
      if (!data) return [];
      const map: Record<string, { name: string; total: number }> = {};
      data.forEach((r: any) => {
        const cid = r.clinic_id || "unknown";
        const cname = r.clinics?.name || "Sem clínica";
        if (!map[cid]) map[cid] = { name: cname, total: 0 };
        map[cid].total += Number(r.amount);
      });
      return Object.values(map).sort((a, b) => b.total - a.total);
    },
  });

  const { data: memberCount = 0 } = useQuery({
    queryKey: ["admin_member_count"],
    queryFn: async () => {
      const { count } = await supabase.from("clinic_members").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const totalClinics = clinics.length;
  const activeClinics = clinics.filter((c: any) => c.status === "active").length;
  const blockedClinics = totalClinics - activeClinics;
  const totalRevenue = revenueByClinic.reduce((s, r) => s + r.total, 0);

  const clinicsByMonth = buildMonthlyData(clinics);
  const appointmentsByMonth = buildMonthlyData(appointments);
  const patientsByMonth = buildMonthlyData(patients);

  const metrics = [
    { title: "Total de Clínicas", value: String(totalClinics), icon: Building2, color: "text-primary" },
    { title: "Clínicas Ativas", value: String(activeClinics), icon: Activity, color: "text-primary" },
    { title: "Bloqueadas/Suspensas", value: String(blockedClinics), icon: Ban, color: "text-destructive" },
    { title: "Total de Pacientes", value: String(patients.length), icon: Users, color: "text-[hsl(var(--info))]" },
    { title: "Total de Atendimentos", value: String(appointments.length), icon: Stethoscope, color: "text-[hsl(var(--warning))]" },
    { title: "Total de Usuários", value: String(memberCount), icon: UserCheck, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Dashboard da Plataforma</h1>
        <p className="text-muted-foreground text-sm">Visão geral do Hof Circle Gestão</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metrics.map((m) => (
          <Card key={m.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{m.title}</CardTitle>
              <m.icon className={`h-4 w-4 ${m.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Novas Clínicas por Mês</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={clinicsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.05)" />
                <XAxis dataKey="month" tick={{ fill: "hsl(0 0% 64%)", fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: "hsl(0 0% 64%)", fontSize: 12 }} />
                <Tooltip {...chartTooltipStyle} />
                <Bar dataKey="count" name="Clínicas" fill="hsl(25 100% 55%)" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Atendimentos por Mês</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={appointmentsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.05)" />
                <XAxis dataKey="month" tick={{ fill: "hsl(0 0% 64%)", fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: "hsl(0 0% 64%)", fontSize: 12 }} />
                <Tooltip {...chartTooltipStyle} />
                <Bar dataKey="count" name="Atendimentos" fill="hsl(0 0% 100% / 0.18)" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Crescimento de Pacientes</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={patientsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.05)" />
                <XAxis dataKey="month" tick={{ fill: "hsl(0 0% 64%)", fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: "hsl(0 0% 64%)", fontSize: 12 }} />
                <Tooltip {...chartTooltipStyle} />
                <Area type="monotone" dataKey="count" name="Pacientes" stroke="hsl(25 100% 55%)" fill="hsl(25 100% 55% / 0.12)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue per clinic */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Faturamento por Clínica
            <span className="text-sm font-normal text-muted-foreground ml-2">
              Total: {formatCurrency(totalRevenue)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {revenueByClinic.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum faturamento registrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clínica</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueByClinic.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {r.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatCurrency(r.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
