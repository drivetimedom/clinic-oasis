import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownCircle, ArrowUpCircle, DollarSign, AlertTriangle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, isAfter, isBefore, addDays } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: receivables = [] } = useQuery({
    queryKey: ["receivables"],
    queryFn: async () => {
      const { data } = await supabase.from("receivables").select("*").eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: payables = [] } = useQuery({
    queryKey: ["payables"],
    queryFn: async () => {
      const { data } = await supabase.from("payables").select("*").eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

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

  // Chart data: last 30 days
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(today, 29 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayReceived = receivables.filter(r => r.payment_date === dateStr).reduce((s, r) => s + Number(r.amount), 0);
    const dayPaid = payables.filter(p => p.payment_date === dateStr).reduce((s, p) => s + Number(p.amount), 0);
    return { date: format(date, "dd/MM"), receitas: dayReceived, despesas: dayPaid };
  });

  const metrics = [
    { title: "A Receber", value: formatCurrency(totalReceivable), icon: ArrowDownCircle, color: "text-success" },
    { title: "A Pagar", value: formatCurrency(totalPayable), icon: ArrowUpCircle, color: "text-destructive" },
    { title: "Saldo", value: formatCurrency(balance), icon: DollarSign, color: balance >= 0 ? "text-success" : "text-destructive" },
    { title: "Vencendo em 7 dias", value: String(upcomingDue.length), icon: AlertTriangle, color: upcomingDue.length > 0 ? "text-warning" : "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Financeiro</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <CardTitle className="text-lg">Evolução Financeira (30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" />
                <XAxis dataKey="date" stroke="hsl(0 0% 64%)" fontSize={12} />
                <YAxis stroke="hsl(0 0% 64%)" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(0 0% 10%)", border: "1px solid hsl(0 0% 18%)", borderRadius: "8px", color: "hsl(0 0% 95%)" }} />
                <Area type="monotone" dataKey="receitas" stroke="hsl(142 69% 58%)" fill="hsl(142 69% 58% / 0.2)" />
                <Area type="monotone" dataKey="despesas" stroke="hsl(0 84% 60%)" fill="hsl(0 84% 60% / 0.2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
