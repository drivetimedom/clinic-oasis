import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const methodLabels: Record<string, string> = {
  cash: "Dinheiro",
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
  pix: "PIX",
  transfer: "Transferência",
};

export default function BillingPayments() {
  const { currentClinic } = useClinic();
  const clinicId = currentClinic!.id;

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["billing-payments", clinicId],
    queryFn: async () => {
      const { data } = await supabase
        .from("billing_payments")
        .select("*, billings(*, patients(name), procedures(name))")
        .eq("clinic_id", clinicId)
        .order("payment_date", { ascending: false });
      return data || [];
    },
  });

  const total = payments.reduce((s: number, p: any) => s + Number(p.amount_paid), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pagamentos</h1>

      <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Recebido</p><p className="text-2xl font-bold text-success">{formatCurrency(total)}</p></CardContent></Card>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Paciente</TableHead><TableHead>Procedimento</TableHead><TableHead>Forma</TableHead><TableHead>Valor</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            : payments.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum pagamento registrado</TableCell></TableRow>
            : payments.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>{formatDate(p.payment_date)}</TableCell>
                <TableCell>{p.billings?.patients?.name || "—"}</TableCell>
                <TableCell>{p.billings?.procedures?.name || "—"}</TableCell>
                <TableCell>{methodLabels[p.payment_method] || p.payment_method}</TableCell>
                <TableCell className="font-medium">{formatCurrency(Number(p.amount_paid))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
