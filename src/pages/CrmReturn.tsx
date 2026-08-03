import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarClock, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CrmReturn() {
  const { currentClinic } = useClinic();
  const clinicId = currentClinic!.id;
  const navigate = useNavigate();

  const { data: returnPatients = [], isLoading } = useQuery({
    queryKey: ["crm-return", clinicId],
    queryFn: async () => {
      // Get all patient procedures with procedure return_days
      const { data: procs } = await supabase
        .from("patient_procedures")
        .select("patient_id, procedure_date, procedure_id, procedures(name, return_days), patients(name)")
        .eq("clinic_id", clinicId)
        .order("procedure_date", { ascending: false });

      if (!procs) return [];

      // Group by patient, get latest procedure per patient
      const latestByPatient: Record<string, any> = {};
      for (const p of procs) {
        if (!latestByPatient[p.patient_id]) {
          latestByPatient[p.patient_id] = p;
        }
      }

      const today = new Date();
      return Object.values(latestByPatient)
        .map((p: any) => {
          const returnDays = (p.procedures as any)?.return_days || 90; // default 90 days
          const lastDate = new Date(p.procedure_date);
          const returnDate = new Date(lastDate);
          returnDate.setDate(returnDate.getDate() + returnDays);
          const daysUntilReturn = Math.ceil((returnDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return {
            patientId: p.patient_id,
            patientName: (p.patients as any)?.name || "—",
            procedureName: (p.procedures as any)?.name || "—",
            lastDate: p.procedure_date,
            returnDate: returnDate.toISOString().split("T")[0],
            daysUntilReturn,
            overdue: daysUntilReturn <= 0,
          };
        })
        .filter(p => p.daysUntilReturn <= 30) // show patients due within 30 days or overdue
        .sort((a, b) => a.daysUntilReturn - b.daysUntilReturn);
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="page-title">Pacientes para Retorno</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Retornos Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm text-center py-4">Carregando...</p>
          ) : returnPatients.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhum paciente com retorno pendente nos próximos 30 dias.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Procedimento</TableHead>
                  <TableHead>Último Atendimento</TableHead>
                  <TableHead>Retorno Sugerido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnPatients.map((p) => (
                  <TableRow key={p.patientId}>
                    <TableCell className="font-medium">{p.patientName}</TableCell>
                    <TableCell>{p.procedureName}</TableCell>
                    <TableCell>{formatDate(p.lastDate)}</TableCell>
                    <TableCell>{formatDate(p.returnDate)}</TableCell>
                    <TableCell>
                      {p.overdue ? (
                        <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Atrasado</Badge>
                      ) : (
                        <Badge variant="secondary">{p.daysUntilReturn} dias</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/patients/${p.patientId}`)}>Ver Ficha</Button>
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
