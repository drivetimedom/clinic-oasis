import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, eachDayOfInterval, subDays } from "date-fns";

export default function CashFlow() {
  const { user } = useAuth();
  const today = new Date();

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

  const days = eachDayOfInterval({ start: subDays(today, 29), end: today });

  const chartData = days.map((day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const entradas = receivables.filter(r => r.payment_date === dateStr).reduce((s, r) => s + Number(r.amount), 0);
    const saidas = payables.filter(p => p.payment_date === dateStr).reduce((s, p) => s + Number(p.amount), 0);
    return { date: format(day, "dd/MM"), entradas, saidas, saldo: entradas - saidas };
  });

  // Daily table with all transactions
  const allTransactions = [
    ...receivables.filter(r => r.status === "paid").map(r => ({ date: r.payment_date!, description: r.description, type: "entrada" as const, amount: Number(r.amount) })),
    ...payables.filter(p => p.status === "paid").map(p => ({ date: p.payment_date!, description: p.description, type: "saida" as const, amount: Number(p.amount) })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Fluxo de Caixa</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fluxo Diário (30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" />
                <XAxis dataKey="date" stroke="hsl(0 0% 64%)" fontSize={12} />
                <YAxis stroke="hsl(0 0% 64%)" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(0 0% 10%)", border: "1px solid hsl(0 0% 18%)", borderRadius: "8px", color: "hsl(0 0% 95%)" }} />
                <Legend />
                <Bar dataKey="entradas" name="Entradas" fill="hsl(142 69% 58%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saidas" name="Saídas" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Movimentações Recentes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allTransactions.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma movimentação encontrada</TableCell></TableRow>
              ) : (
                allTransactions.map((t, i) => (
                  <TableRow key={i}>
                    <TableCell>{formatDate(t.date)}</TableCell>
                    <TableCell>{t.description}</TableCell>
                    <TableCell>
                      <span className={t.type === "entrada" ? "text-success" : "text-destructive"}>
                        {t.type === "entrada" ? "Entrada" : "Saída"}
                      </span>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${t.type === "entrada" ? "text-success" : "text-destructive"}`}>
                      {t.type === "entrada" ? "+" : "-"}{formatCurrency(t.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
