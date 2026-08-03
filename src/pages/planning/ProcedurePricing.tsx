import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function ProcedurePricing() {
  const { currentClinic } = useClinic();
  const clinicId = currentClinic?.id;

  const { data: procedures = [] } = useQuery({
    queryKey: ["procedures-pricing", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procedures")
        .select("id, name, suggested_price, duration_minutes")
        .eq("clinic_id", clinicId!)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!clinicId,
  });

  const { data: costs = [] } = useQuery({
    queryKey: ["clinic-costs", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_costs")
        .select("monthly_amount")
        .eq("clinic_id", clinicId!);
      if (error) throw error;
      return data;
    },
    enabled: !!clinicId,
  });

  const { data: settings } = useQuery({
    queryKey: ["clinic-settings", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_settings")
        .select("monthly_working_hours")
        .eq("clinic_id", clinicId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clinicId,
  });

  const totalMonthlyCost = costs.reduce((sum, c) => sum + Number(c.monthly_amount), 0);
  const monthlyHours = settings?.monthly_working_hours || 160;
  const costPerHour = monthlyHours > 0 ? totalMonthlyCost / monthlyHours : 0;

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const pctFmt = (v: number) => `${v.toFixed(1)}%`;

  const rows = procedures.map((p) => {
    const price = Number(p.suggested_price) || 0;
    const durationMin = p.duration_minutes || 60;
    const hourCost = (durationMin / 60) * costPerHour;
    const margin = price - hourCost;
    const marginPct = price > 0 ? (margin / price) * 100 : 0;
    return { ...p, price, durationMin, hourCost, margin, marginPct };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Precificação de Procedimentos</h1>
        <p className="text-muted-foreground">Analise a rentabilidade de cada procedimento</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Custo por Hora da Clínica</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="num text-[26px] font-semibold tracking-[-0.03em]">{fmt(costPerHour)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Procedimentos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="num text-[26px] font-semibold tracking-[-0.03em]">{procedures.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Procedimento</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-right">Duração (min)</TableHead>
                <TableHead className="text-right">Custo Hora Clínica</TableHead>
                <TableHead className="text-right">Margem</TableHead>
                <TableHead className="text-right">Margem %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum procedimento cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right">{fmt(r.price)}</TableCell>
                    <TableCell className="text-right">{r.durationMin}</TableCell>
                    <TableCell className="text-right">{fmt(r.hourCost)}</TableCell>
                    <TableCell className="text-right">{fmt(r.margin)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={r.marginPct >= 50 ? "default" : r.marginPct >= 20 ? "secondary" : "destructive"}>
                        {pctFmt(r.marginPct)}
                      </Badge>
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
