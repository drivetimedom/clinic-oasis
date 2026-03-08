import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { formatCurrency, formatDate } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

const statusLabels: Record<string, string> = { pending: "Pendente", paid: "Pago", cancelled: "Cancelado" };
const statusColors: Record<string, string> = {
  pending: "bg-warning/20 text-warning",
  paid: "bg-success/20 text-success",
  cancelled: "bg-muted text-muted-foreground",
};

export default function Commissions() {
  const { currentClinic } = useClinic();
  const clinicId = currentClinic!.id;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [doctorFilter, setDoctorFilter] = useState("all");

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors", clinicId],
    queryFn: async () => { const { data } = await supabase.from("doctors").select("id, name, commission_percentage").eq("clinic_id", clinicId).eq("active", true).order("name"); return data || []; },
  });

  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ["commissions", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("commissions").select("*, doctors(name), procedures(name)").eq("clinic_id", clinicId).order("billing_date", { ascending: false });
      return data || [];
    },
  });

  const filtered = commissions.filter((c: any) => {
    const matchSearch = (c.doctors?.name || "").toLowerCase().includes(search.toLowerCase()) || (c.procedures?.name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchDoctor = doctorFilter === "all" || c.doctor_id === doctorFilter;
    return matchSearch && matchStatus && matchDoctor;
  });

  const totalPending = filtered.filter((c: any) => c.status === "pending").reduce((s: number, c: any) => s + Number(c.commission_amount), 0);
  const totalPaid = filtered.filter((c: any) => c.status === "paid").reduce((s: number, c: any) => s + Number(c.commission_amount), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Comissões</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Comissões Pendentes</p><p className="text-2xl font-bold text-warning">{formatCurrency(totalPending)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Comissões Pagas</p><p className="text-2xl font-bold text-success">{formatCurrency(totalPaid)}</p></CardContent></Card>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-10" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Select value={doctorFilter} onValueChange={setDoctorFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Profissional" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem>{doctors.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="pending">Pendente</SelectItem><SelectItem value="paid">Pago</SelectItem></SelectContent>
        </Select>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Profissional</TableHead><TableHead>Procedimento</TableHead><TableHead>Valor Proc.</TableHead><TableHead>%</TableHead><TableHead>Comissão</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            : filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma comissão encontrada</TableCell></TableRow>
            : filtered.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell>{formatDate(c.billing_date)}</TableCell>
                <TableCell className="font-medium">{c.doctors?.name || "—"}</TableCell>
                <TableCell>{c.procedures?.name || "—"}</TableCell>
                <TableCell>{formatCurrency(Number(c.procedure_amount))}</TableCell>
                <TableCell>{Number(c.commission_percentage)}%</TableCell>
                <TableCell className="font-medium">{formatCurrency(Number(c.commission_amount))}</TableCell>
                <TableCell><Badge className={statusColors[c.status] || ""}>{statusLabels[c.status] || c.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
