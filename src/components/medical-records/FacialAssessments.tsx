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
import { Plus, ClipboardList, ChevronDown, ChevronUp } from "lucide-react";

type Props = { patientId: string };

export default function FacialAssessments({ patientId }: Props) {
  const { currentClinic } = useClinic();
  const clinicId = currentClinic!.id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    skin_type: "", flaccidity_level: "", wrinkles: "", facial_asymmetry: "",
    lip_volume: "", malar_volume: "", mandibular_volume: "", clinical_notes: "",
    doctor_id: "", assessment_date: new Date().toISOString().split("T")[0],
  });

  const { data: assessments = [] } = useQuery({
    queryKey: ["facial-assessments", patientId, clinicId],
    queryFn: async () => {
      const { data } = await supabase
        .from("facial_assessments")
        .select("*, doctors(name)")
        .eq("patient_id", patientId)
        .eq("clinic_id", clinicId)
        .order("assessment_date", { ascending: false });
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
      const { error } = await supabase.from("facial_assessments").insert({
        patient_id: patientId,
        clinic_id: clinicId,
        ...form,
        doctor_id: form.doctor_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facial-assessments"] });
      setOpen(false);
      setForm({ skin_type: "", flaccidity_level: "", wrinkles: "", facial_asymmetry: "", lip_volume: "", malar_volume: "", mandibular_volume: "", clinical_notes: "", doctor_id: "", assessment_date: new Date().toISOString().split("T")[0] });
      toast({ title: "Avaliação registrada!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const skinTypes = ["Normal", "Oleosa", "Seca", "Mista", "Sensível"];
  const levels = ["Ausente", "Leve", "Moderado", "Acentuado"];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" />Avaliação Facial</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Avaliação</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nova Avaliação Facial</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={form.assessment_date} onChange={e => setForm({ ...form, assessment_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Profissional</Label>
                <Select value={form.doctor_id} onValueChange={v => setForm({ ...form, doctor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Pele</Label>
                <Select value={form.skin_type} onValueChange={v => setForm({ ...form, skin_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{skinTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Grau de Flacidez</Label>
                <Select value={form.flaccidity_level} onValueChange={v => setForm({ ...form, flaccidity_level: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rugas</Label>
                <Select value={form.wrinkles} onValueChange={v => setForm({ ...form, wrinkles: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assimetria Facial</Label>
                <Select value={form.facial_asymmetry} onValueChange={v => setForm({ ...form, facial_asymmetry: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Volume Labial</Label>
                <Select value={form.lip_volume} onValueChange={v => setForm({ ...form, lip_volume: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Volume Malar</Label>
                <Select value={form.malar_volume} onValueChange={v => setForm({ ...form, malar_volume: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Volume Mandibular</Label>
                <Select value={form.mandibular_volume} onValueChange={v => setForm({ ...form, mandibular_volume: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Observações Clínicas</Label>
                <Textarea value={form.clinical_notes} onChange={e => setForm({ ...form, clinical_notes: e.target.value })} rows={3} />
              </div>
            </div>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="w-full mt-4">
              {mutation.isPending ? "Salvando..." : "Salvar Avaliação"}
            </Button>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {assessments.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhuma avaliação registrada.</p>
        ) : (
          <div className="space-y-3">
            {assessments.map((a: any) => (
              <div key={a.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                  <div>
                    <p className="font-medium text-sm">{formatDate(a.assessment_date)}</p>
                    <p className="text-xs text-muted-foreground">{a.doctors?.name || "Profissional não informado"}</p>
                  </div>
                  {expanded === a.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
                {expanded === a.id && (
                  <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-sm">
                    {a.skin_type && <div><span className="text-muted-foreground">Pele:</span> {a.skin_type}</div>}
                    {a.flaccidity_level && <div><span className="text-muted-foreground">Flacidez:</span> {a.flaccidity_level}</div>}
                    {a.wrinkles && <div><span className="text-muted-foreground">Rugas:</span> {a.wrinkles}</div>}
                    {a.facial_asymmetry && <div><span className="text-muted-foreground">Assimetria:</span> {a.facial_asymmetry}</div>}
                    {a.lip_volume && <div><span className="text-muted-foreground">Volume Labial:</span> {a.lip_volume}</div>}
                    {a.malar_volume && <div><span className="text-muted-foreground">Volume Malar:</span> {a.malar_volume}</div>}
                    {a.mandibular_volume && <div><span className="text-muted-foreground">Volume Mandibular:</span> {a.mandibular_volume}</div>}
                    {a.clinical_notes && <div className="col-span-2"><span className="text-muted-foreground">Observações:</span> <p className="mt-1 whitespace-pre-wrap">{a.clinical_notes}</p></div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
