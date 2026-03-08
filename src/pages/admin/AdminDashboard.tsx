import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Stethoscope, DollarSign, Activity } from "lucide-react";

export default function AdminDashboard() {
  const { data: clinics = [] } = useQuery({
    queryKey: ["admin_clinics"],
    queryFn: async () => {
      const { data } = await supabase.from("clinics").select("id, name, status");
      return data || [];
    },
  });

  const { data: patientCount = 0 } = useQuery({
    queryKey: ["admin_patient_count"],
    queryFn: async () => {
      const { count } = await supabase.from("patients").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: appointmentCount = 0 } = useQuery({
    queryKey: ["admin_appointment_count"],
    queryFn: async () => {
      const { count } = await supabase.from("appointments").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: totalRevenue = 0 } = useQuery({
    queryKey: ["admin_total_revenue"],
    queryFn: async () => {
      const { data } = await supabase.from("receivables").select("amount").eq("status", "paid");
      return (data || []).reduce((s, r) => s + Number(r.amount), 0);
    },
  });

  const totalClinics = clinics.length;
  const activeClinics = clinics.filter((c: any) => c.status === "active").length;

  const metrics = [
    { title: "Total de Clínicas", value: String(totalClinics), icon: Building2, color: "text-primary" },
    { title: "Clínicas Ativas", value: String(activeClinics), icon: Activity, color: "hsl(var(--success))", className: "text-[hsl(var(--success))]" },
    { title: "Total de Pacientes", value: String(patientCount), icon: Users, color: "text-[hsl(var(--info))]" },
    { title: "Total de Atendimentos", value: String(appointmentCount), icon: Stethoscope, color: "text-[hsl(var(--warning))]" },
    { title: "Faturamento Total", value: formatCurrency(totalRevenue), icon: DollarSign, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard da Plataforma</h1>
        <p className="text-muted-foreground text-sm">Visão geral do Hof Circle Gestão</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics.map((m) => (
          <Card key={m.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{m.title}</CardTitle>
              <m.icon className={`h-5 w-5 ${m.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

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
