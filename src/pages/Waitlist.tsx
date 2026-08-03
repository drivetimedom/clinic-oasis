import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Plus, CalendarIcon, Trash2, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";

type WaitlistEntry = Tables<"waitlist"> & {
  patients?: { name: string } | null;
  procedures?: { name: string } | null;
  doctors?: { name: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  waiting: "Aguardando", scheduled: "Agendado", cancelled: "Cancelado",
};
const STATUS_COLORS: Record<string, string> = {
  waiting: "bg-warning/20 text-warning", scheduled: "bg-success/20 text-success", cancelled: "bg-muted text-muted-foreground",
};

export default function Waitlist() {
  const { currentClinic } = useClinic();
  const clinicId = currentClinic!.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    patient_id: "", procedure_id: "", doctor_id: "", desired_date: null as Date | null, observation: "",
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["waitlist_all", clinicId],
    queryFn: async () => {
      const { data } = await supabase
        .from("waitlist").select("*, patients(name), procedures(name), doctors(name)")
        .eq("clinic_id", clinicId).order("created_at", { ascending: false });
      return (data || []) as WaitlistEntry[];
    },
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("patients").select("id, name").eq("clinic_id", clinicId).order("name");
      return data || [];
    },
  });

  const { data: procedures = [] } = useQuery({
    queryKey: ["procedures_active_wl", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("procedures").select("id, name").eq("clinic_id", clinicId).eq("active", true).order("name");
      return data || [];
    },
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("doctors").select("id, name, color").eq("clinic_id", clinicId).eq("active", true).order("name");
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("waitlist").insert({
        clinic_id: clinicId,
        patient_id: form.patient_id,
        procedure_id: form.procedure_id || null,
        doctor_id: form.doctor_id || null,
        desired_date: form.desired_date ? format(form.desired_date, "yyyy-MM-dd") : null,
        observation: form.observation || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist_all"] });
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      setOpen(false);
      setForm({ patient_id: "", procedure_id: "", doctor_id: "", desired_date: null, observation: "" });
      toast({ title: "Paciente adicionado à lista de espera!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("waitlist").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist_all"] });
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      toast({ title: "Removido da lista de espera" });
    },
  });

  const waitingEntries = entries.filter((e) => e.status === "waiting");
  const otherEntries = entries.filter((e) => e.status !== "waiting");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="page-title">Lista de Espera</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Adicionar</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar à Lista de Espera</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2"><Label>Paciente *</Label>
                <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Procedimento desejado</Label>
                <Select value={form.procedure_id} onValueChange={(v) => setForm({ ...form, procedure_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>{procedures.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Profissional (opcional)</Label>
                <Select value={form.doctor_id} onValueChange={(v) => setForm({ ...form, doctor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                  <SelectContent>{doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Data desejada</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.desired_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />{form.desired_date ? format(form.desired_date, "dd/MM/yyyy") : "Opcional"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.desired_date || undefined} onSelect={(d) => setForm({ ...form, desired_date: d || null })} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2"><Label>Observação</Label><Textarea value={form.observation} onChange={(e) => setForm({ ...form, observation: e.target.value })} rows={2} /></div>
              <Button type="submit" className="w-full" disabled={addMutation.isPending || !form.patient_id}>
                {addMutation.isPending ? "Salvando..." : "Adicionar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {waitingEntries.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum paciente na lista de espera</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {waitingEntries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{entry.patients?.name}</p>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                    {entry.procedures?.name && <span>Procedimento: {entry.procedures.name}</span>}
                    {entry.doctors?.name && <span>• Profissional: {entry.doctors.name}</span>}
                    {entry.desired_date && <span>• Data: {format(new Date(entry.desired_date + "T12:00:00"), "dd/MM/yyyy")}</span>}
                  </div>
                  {entry.observation && <p className="text-xs text-muted-foreground mt-1">{entry.observation}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[entry.status]}>{STATUS_LABELS[entry.status]}</Badge>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeMutation.mutate(entry.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {otherEntries.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">Histórico</h2>
          {otherEntries.map((entry) => (
            <Card key={entry.id} className="opacity-60">
              <CardContent className="py-3 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{entry.patients?.name}</p>
                  <p className="text-xs text-muted-foreground">{entry.procedures?.name || "—"}</p>
                </div>
                <Badge className={STATUS_COLORS[entry.status]}>{STATUS_LABELS[entry.status]}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
