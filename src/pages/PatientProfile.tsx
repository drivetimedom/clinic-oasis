import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { formatDate, formatCurrency, getStatusLabel, getStatusColor } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, FileText } from "lucide-react";

export default function PatientProfile() {
  const { id } = useParams();
  const { currentClinic } = useClinic();
  const clinicId = currentClinic!.id;
  const navigate = useNavigate();

  const { data: patient } = useQuery({
    queryKey: ["patient", id, clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("patients").select("*").eq("id", id!).eq("clinic_id", clinicId).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: receivables = [] } = useQuery({
    queryKey: ["patient-receivables", id],
    queryFn: async () => {
      const { data } = await supabase.from("receivables").select("*").eq("patient_id", id!).eq("clinic_id", clinicId).order("due_date", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  if (!patient) return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;

  const genderLabel = patient.gender === "female" ? "Feminino" : patient.gender === "male" ? "Masculino" : patient.gender || "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/patients")}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-bold">Ficha do Paciente</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" />Dados Pessoais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-2xl font-bold">{patient.name}</p>
            {patient.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />{patient.email}</div>}
            {patient.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{patient.phone}</div>}
            {patient.birth_date && <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" />{formatDate(patient.birth_date)}</div>}
            {(patient.address || patient.city) && <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" />{[patient.address, patient.city, patient.state].filter(Boolean).join(", ")}</div>}
            <div className="pt-2 border-t border-border space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">CPF</span><span>{patient.cpf || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Gênero</span><span>{genderLabel}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">CEP</span><span>{patient.zip_code || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Cadastro</span><span>{formatDate(patient.created_at)}</span></div>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Observações</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{patient.notes || "Nenhuma observação registrada."}</p></CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Histórico Financeiro</CardTitle></CardHeader>
        <CardContent>
          {receivables.length === 0 ? <p className="text-muted-foreground text-sm text-center py-4">Nenhum registro financeiro.</p>
          : <div className="space-y-3">{receivables.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div><p className="font-medium text-sm">{r.description}</p><p className="text-xs text-muted-foreground">Venc: {formatDate(r.due_date)}</p></div>
              <div className="flex items-center gap-3"><Badge className={getStatusColor(r.status)}>{getStatusLabel(r.status)}</Badge><span className="font-bold">{formatCurrency(Number(r.amount))}</span></div>
            </div>
          ))}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
