import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Syringe } from "lucide-react";

type Props = { patientId: string };

export default function PatientProcedures({ patientId }: Props) {
  const { currentClinic } = useClinic();
  const clinicId = currentClinic!.id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    procedure_id: "", protocol_id: "", doctor_id: "", area_treated: "",
    quantity_applied: "", clinical_notes: "", procedure_date: new Date().toISOString().split("T")[0],
  });

  const { data: records = [] } = useQuery({
    queryKey: ["patient-procedures", patientId, clinicId],
    queryFn: async () => {
      const { data } = await supabase
        .from("patient_procedures")
        .select("*, doctors(name), procedures(name), protocols(name)")
        .eq("patient_id", patientId)
        .eq("clinic_id", clinicId)
        .order("procedure_date", { ascending: false });
      return data || [];
    },
  });

  const { data: procedures = [] } = useQuery({
    queryKey: ["procedures", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("procedures").select("id, name").eq("clinic_id", clinicId).eq("active", true);
      return data || [];
    },
  });

  const { data: protocols = [] } = useQuery({
    queryKey: ["protocols-for-procedure", form.procedure_id],
    queryFn: async () => {
      if (!form.procedure_id) return [];
      const { data } = await supabase.from("protocols").select("id, name").eq("procedure_id", form.procedure_id).eq("clinic_id", clinicId);
      return data || [];
    },
    enabled: !!form.procedure_id,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("doctors").select("id, name").eq("clinic_id", clinicId).eq("active", true);
      return data || [];
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("patient_procedures").insert({
        patient_id: patientId,
        clinic_id: clinicId,
        procedure_id: form.procedure_id || null,
        protocol_id: form.protocol_id || null,
        doctor_id: form.doctor_id || null,
        area_treated: form.area_treated || null,
        quantity_applied: form.quantity_applied || null,
        clinical_notes: form.clinical_notes || null,
        procedure_date: form.procedure_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-procedures"] });
      setOpen(false);
      setForm({ procedure_id: "", protocol_id: "", doctor_id: "", area_treated: "", quantity_applied: "", clinical_notes: "", procedure_date: new Date().toISOString().split("T")[0] });
      toast({ title: "Procedimento registrado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Syringe className="h-5 w-5 text-primary" />Histórico de Procedimentos</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Registrar</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Registrar Procedimento</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" value={form.procedure_date} onChange={e => setForm({ ...form, procedure_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Profissional</Label>
                  <Select value={form.doctor_id} onValueChange={v => setForm({ ...form, doctor_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Procedimento</Label>
                <Select value={form.procedure_id} onValueChange={v => setForm({ ...form, procedure_id: v, protocol_id: "" })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o procedimento" /></SelectTrigger>
                  <SelectContent>{procedures.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {protocols.length > 0 && (
                <div className="space-y-2">
                  <Label>Protocolo Utilizado</Label>
                  <Select value={form.protocol_id} onValueChange={v => setForm({ ...form, protocol_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                    <SelectContent>{protocols.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Área Tratada</Label>
                  <Input value={form.area_treated} onChange={e => setForm({ ...form, area_treated: e.target.value })} placeholder="Ex: Lábios, Glabela..." />
                </div>
                <div className="space-y-2">
                  <Label>Quantidade Aplicada</Label>
                  <Input value={form.quantity_applied} onChange={e => setForm({ ...form, quantity_applied: e.target.value })} placeholder="Ex: 1ml, 20UI..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observações Clínicas</Label>
                <Textarea value={form.clinical_notes} onChange={e => setForm({ ...form, clinical_notes: e.target.value })} rows={3} />
              </div>
            </div>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="w-full mt-4">
              {mutation.isPending ? "Salvando..." : "Registrar Procedimento"}
            </Button>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhum procedimento registrado.</p>
        ) : (
          <div className="space-y-3">
            {records.map((r: any) => (
              <div key={r.id} className="flex items-start justify-between p-3 rounded-lg bg-secondary/50">
                <div className="space-y-1">
                  <p className="font-medium text-sm">{r.procedures?.name || "Procedimento"}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(r.procedure_date)} • {r.doctors?.name || "—"}</p>
                  {r.protocols?.name && <p className="text-xs text-muted-foreground">Protocolo: {r.protocols.name}</p>}
                  {r.area_treated && <p className="text-xs">Área: {r.area_treated}</p>}
                  {r.quantity_applied && <p className="text-xs">Qtd: {r.quantity_applied}</p>}
                  {r.clinical_notes && <p className="text-xs text-muted-foreground mt-1">{r.clinical_notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
