import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserX } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CrmInactive() {
  const { currentClinic } = useClinic();
  const clinicId = currentClinic!.id;
  const navigate = useNavigate();

  const { data: inactivePatients = [], isLoading } = useQuery({
    queryKey: ["crm-inactive", clinicId],
    queryFn: async () => {
      // Get all patients
      const { data: patients } = await supabase
        .from("patients")
        .select("id, name")
        .eq("clinic_id", clinicId);

      if (!patients) return [];

      // Get latest procedure per patient
      const { data: procs } = await supabase
        .from("patient_procedures")
        .select("patient_id, procedure_date, procedures(name)")
        .eq("clinic_id", clinicId)
        .order("procedure_date", { ascending: false });

      const latestProc: Record<string, any> = {};
      for (const p of procs || []) {
        if (!latestProc[p.patient_id]) latestProc[p.patient_id] = p;
      }

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      return patients
        .map(patient => {
          const last = latestProc[patient.id];
          const lastDate = last ? new Date(last.procedure_date) : null;
          const daysSince = lastDate ? Math.ceil((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
          return {
            id: patient.id,
            name: patient.name,
            lastProcedure: last ? (last.procedures as any)?.name || "—" : "Nenhum",
            lastDate: last?.procedure_date || null,
            daysSince,
          };
        })
        .filter(p => !p.lastDate || new Date(p.lastDate) < sixMonthsAgo)
        .sort((a, b) => (a.daysSince || 9999) - (b.daysSince || 9999));
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="page-title">Pacientes Inativos</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-primary" />
            Sem atendimento há mais de 6 meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm text-center py-4">Carregando...</p>
          ) : inactivePatients.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhum paciente inativo encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Último Procedimento</TableHead>
                  <TableHead>Último Atendimento</TableHead>
                  <TableHead>Dias Inativo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactivePatients.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.lastProcedure}</TableCell>
                    <TableCell>{p.lastDate ? formatDate(p.lastDate) : "Nunca"}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{p.daysSince ? `${p.daysSince} dias` : "Sem registro"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/patients/${p.id}`)}>Ver Ficha</Button>
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
