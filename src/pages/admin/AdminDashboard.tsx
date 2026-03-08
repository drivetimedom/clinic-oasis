import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Stethoscope, DollarSign, Activity, Ban, UserCheck } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import { format, subMonths, startOfMonth, parseISO } from "date-fns";
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

  const { data: totalRevenue = 0 } = useQuery({
    queryKey: ["admin_total_revenue"],
    queryFn: async () => {
      const { data } = await supabase.from("receivables").select("amount").eq("status", "paid");
      return (data || []).reduce((s, r) => s + Number(r.amount), 0);
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
  const blockedClinics = clinics.filter((c: any) => c.status === "blocked").length;

  const clinicsByMonth = buildMonthlyData(clinics);
  const appointmentsByMonth = buildMonthlyData(appointments);
  const patientsByMonth = buildMonthlyData(patients);

  const metrics = [
    { title: "Total de Clínicas", value: String(totalClinics), icon: Building2, color: "text-primary" },
    { title: "Clínicas Ativas", value: String(activeClinics), icon: Activity, color: "text-primary" },
    { title: "Clínicas Bloqueadas", value: String(blockedClinics), icon: Ban, color: "text-destructive" },
    { title: "Total de Pacientes", value: String(patients.length), icon: Users, color: "text-[hsl(var(--info))]" },
    { title: "Total de Atendimentos", value: String(appointments.length), icon: Stethoscope, color: "text-[hsl(var(--warning))]" },
    { title: "Total de Usuários", value: String(memberCount), icon: UserCheck, color: "text-primary" },
  ];

  const chartTooltipStyle = {
    contentStyle: {
      backgroundColor: "hsl(0 0% 10%)",
      border: "1px solid hsl(0 0% 18%)",
      borderRadius: "8px",
      color: "hsl(0 0% 95%)",
      fontSize: 12,
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard da Plataforma</h1>
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
          <CardHeader>
            <CardTitle className="text-sm">Novas Clínicas por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={clinicsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" />
                <XAxis dataKey="month" tick={{ fill: "hsl(0 0% 64%)", fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: "hsl(0 0% 64%)", fontSize: 12 }} />
                <Tooltip {...chartTooltipStyle} />
                <Bar dataKey="count" name="Clínicas" fill="hsl(142 69% 58%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Atendimentos por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={appointmentsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" />
                <XAxis dataKey="month" tick={{ fill: "hsl(0 0% 64%)", fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: "hsl(0 0% 64%)", fontSize: 12 }} />
                <Tooltip {...chartTooltipStyle} />
                <Bar dataKey="count" name="Atendimentos" fill="hsl(45 93% 47%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Crescimento de Pacientes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={patientsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" />
                <XAxis dataKey="month" tick={{ fill: "hsl(0 0% 64%)", fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: "hsl(0 0% 64%)", fontSize: 12 }} />
                <Tooltip {...chartTooltipStyle} />
                <Area type="monotone" dataKey="count" name="Pacientes" stroke="hsl(217 91% 60%)" fill="hsl(217 91% 60% / 0.2)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent clinics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Clínicas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {clinics.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma clínica cadastrada.</p>
          ) : (
            <div className="space-y-2">
              {clinics.slice(0, 5).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{c.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${c.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                    {c.status === 'active' ? 'Ativa' : 'Bloqueada'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
