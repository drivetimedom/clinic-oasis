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
import { Plus, BookOpen } from "lucide-react";

type Props = { patientId: string };

export default function PatientEvolutions({ patientId }: Props) {
  const { currentClinic } = useClinic();
  const clinicId = currentClinic!.id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    doctor_id: "", description: "", evolution_date: new Date().toISOString().split("T")[0],
  });

  const { data: evolutions = [] } = useQuery({
    queryKey: ["patient-evolutions", patientId, clinicId],
    queryFn: async () => {
      const { data } = await supabase
        .from("patient_evolutions")
        .select("*, doctors(name)")
        .eq("patient_id", patientId)
        .eq("clinic_id", clinicId)
        .order("evolution_date", { ascending: false });
      return data || [];
    },
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
      const { error } = await supabase.from("patient_evolutions").insert({
        patient_id: patientId,
        clinic_id: clinicId,
        doctor_id: form.doctor_id || null,
        description: form.description,
        evolution_date: form.evolution_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-evolutions"] });
      setOpen(false);
      setForm({ doctor_id: "", description: "", evolution_date: new Date().toISOString().split("T")[0] });
      toast({ title: "Evolução registrada!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" />Evolução do Paciente</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Evolução</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Evolução</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" value={form.evolution_date} onChange={e => setForm({ ...form, evolution_date: e.target.value })} />
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
                <Label>Descrição da Evolução *</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={5} placeholder="Descreva a evolução clínica do paciente..." />
              </div>
            </div>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.description.trim()} className="w-full mt-4">
              {mutation.isPending ? "Salvando..." : "Registrar Evolução"}
            </Button>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {evolutions.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhuma evolução registrada.</p>
        ) : (
          <div className="space-y-4">
            {evolutions.map((e: any) => (
              <div key={e.id} className="border-l-2 border-primary/30 pl-4 py-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span className="font-medium">{formatDate(e.evolution_date)}</span>
                  <span>•</span>
                  <span>{e.doctors?.name || "Profissional não informado"}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{e.description}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
