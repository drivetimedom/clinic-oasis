import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClinic } from "@/contexts/ClinicContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, ChevronLeft, ChevronRight, CalendarIcon, X, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";

type Appointment = Tables<"appointments"> & {
  doctors?: { name: string; color: string } | null;
  patients?: { name: string } | null;
  procedures?: { name: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendado", confirmed: "Confirmado", completed: "Concluído",
  cancelled: "Cancelado", no_show: "Não compareceu",
};
const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-info/20 text-info", confirmed: "bg-success/20 text-success",
  completed: "bg-muted text-muted-foreground", cancelled: "bg-destructive/20 text-destructive",
  no_show: "bg-warning/20 text-warning",
};

export default function Agenda() {
  const { user } = useAuth();
  const { currentClinic } = useClinic();
  const clinicId = currentClinic!.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null);

  const [form, setForm] = useState({
    doctor_id: "", patient_id: "", procedure_id: "", title: "", description: "",
    appointment_date: new Date(), start_time: "", end_time: "",
    is_recurring: false, recurrence_type: "weekly" as string, recurrence_end_date: null as Date | null,
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("doctors").select("*").eq("clinic_id", clinicId).eq("active", true).order("name");
      return data || [];
    },
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("patients").select("id, name").eq("clinic_id", clinicId).order("name");
      return data || [];
    },
  });

  const { data: clinicProcedures = [] } = useQuery({
    queryKey: ["procedures_active_agenda", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("procedures").select("id, name").eq("clinic_id", clinicId).eq("active", true).order("name");
      return data || [];
    },
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments", clinicId, format(weekStart, "yyyy-MM-dd"), format(weekEnd, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments").select("*, doctors(name, color), patients(name), procedures(name)")
        .eq("clinic_id", clinicId)
        .gte("appointment_date", format(weekStart, "yyyy-MM-dd"))
        .lte("appointment_date", format(weekEnd, "yyyy-MM-dd"))
        .neq("status", "cancelled").order("start_time");
      return (data || []) as Appointment[];
    },
  });

  const { data: availabilitySlots = [] } = useQuery({
    queryKey: ["availability_slots", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("availability_slots").select("*").eq("clinic_id", clinicId).eq("active", true);
      return data || [];
    },
  });

  const getAvailableSlots = (date: Date, doctorId: string) => {
    const dayOfWeek = date.getDay();
    const doctorSlots = availabilitySlots.filter((s) => s.doctor_id === doctorId && s.day_of_week === dayOfWeek);
    const timeSlots: string[] = [];
    doctorSlots.forEach((slot) => {
      const [startH, startM] = slot.start_time.split(":").map(Number);
      const [endH, endM] = slot.end_time.split(":").map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;
      for (let m = startMin; m + slot.slot_duration <= endMin; m += slot.slot_duration) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        timeSlots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
      }
    });
    const dateStr = format(date, "yyyy-MM-dd");
    const booked = appointments.filter((a) => a.appointment_date === dateStr && a.doctor_id === doctorId);
    return timeSlots.filter((slot) => !booked.some((a) => a.start_time.slice(0, 5) === slot));
  };

  const availableSlots = form.doctor_id && form.appointment_date ? getAvailableSlots(form.appointment_date, form.doctor_id) : [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const dateStr = format(form.appointment_date, "yyyy-MM-dd");
      const doctorSlot = availabilitySlots.find((s) => s.doctor_id === form.doctor_id && s.day_of_week === form.appointment_date.getDay());
      const duration = doctorSlot?.slot_duration || 60;
      const [h, m] = form.start_time.split(":").map(Number);
      const endMin = h * 60 + m + duration;
      const endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;

      if (form.is_recurring && form.recurrence_end_date) {
        const groupId = crypto.randomUUID();
        const items: any[] = [];
        let cur = form.appointment_date;
        while (cur <= form.recurrence_end_date) {
          items.push({
            user_id: user!.id, clinic_id: clinicId, doctor_id: form.doctor_id,
            patient_id: form.patient_id || null, procedure_id: form.procedure_id || null, title: form.title,
            description: form.description || null, appointment_date: format(cur, "yyyy-MM-dd"),
            start_time: form.start_time, end_time: endTime,
            is_recurring: true, recurrence_type: form.recurrence_type,
            recurrence_end_date: format(form.recurrence_end_date, "yyyy-MM-dd"), recurrence_group_id: groupId,
          });
          if (form.recurrence_type === "weekly") cur = addWeeks(cur, 1);
          else if (form.recurrence_type === "biweekly") cur = addWeeks(cur, 2);
          else cur = addMonths(cur, 1);
        }
        const { error } = await supabase.from("appointments").insert(items);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("appointments").insert({
          user_id: user!.id, clinic_id: clinicId, doctor_id: form.doctor_id,
          patient_id: form.patient_id || null, procedure_id: form.procedure_id || null, title: form.title,
          description: form.description || null, appointment_date: dateStr,
          start_time: form.start_time, end_time: endTime,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setOpen(false);
      setForm({ doctor_id: "", patient_id: "", procedure_id: "", title: "", description: "", appointment_date: new Date(), start_time: "", end_time: "", is_recurring: false, recurrence_type: "weekly", recurrence_end_date: null });
      toast({ title: "Agendamento criado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setDetailAppointment(null);
      toast({ title: "Status atualizado!" });
    },
  });

  const filteredAppointments = selectedDoctor === "all" ? appointments : appointments.filter((a) => a.doctor_id === selectedDoctor);
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Agenda</h1>
        <div className="flex items-center gap-3">
          <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as doutoras</SelectItem>
              {doctors.map((d) => <SelectItem key={d.id} value={d.id}><div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />{d.name}</div></SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Agendar</Button></DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Novo Agendamento</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
                <div className="space-y-2"><Label>Doutora *</Label>
                  <Select value={form.doctor_id} onValueChange={(v) => setForm({ ...form, doctor_id: v, start_time: "" })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{doctors.map((d) => <SelectItem key={d.id} value={d.id}><div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />{d.name}</div></SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Paciente</Label>
                  <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                    <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Procedimento</Label>
                  <Select value={form.procedure_id} onValueChange={(v) => setForm({ ...form, procedure_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                    <SelectContent>{clinicProcedures.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Ex: Consulta, Limpeza de pele..." /></div>
                <div className="space-y-2"><Label>Data *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.appointment_date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />{format(form.appointment_date, "dd/MM/yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={form.appointment_date} onSelect={(d) => d && setForm({ ...form, appointment_date: d, start_time: "" })} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2"><Label>Horário Disponível *</Label>
                  {!form.doctor_id ? <p className="text-sm text-muted-foreground">Selecione a doutora primeiro</p>
                  : availableSlots.length === 0 ? <p className="text-sm text-warning">Nenhum horário disponível neste dia</p>
                  : <div className="grid grid-cols-4 gap-2">{availableSlots.map((slot) => (
                    <Button key={slot} type="button" variant={form.start_time === slot ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, start_time: slot })}>{slot}</Button>
                  ))}</div>}
                </div>
                <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
                <div className="space-y-3 border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2"><Switch checked={form.is_recurring} onCheckedChange={(v) => setForm({ ...form, is_recurring: v })} /><Label>Evento Recorrente</Label></div>
                  {form.is_recurring && (
                    <div className="space-y-3">
                      <Select value={form.recurrence_type} onValueChange={(v) => setForm({ ...form, recurrence_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="weekly">Semanal</SelectItem><SelectItem value="biweekly">Quinzenal</SelectItem><SelectItem value="monthly">Mensal</SelectItem></SelectContent>
                      </Select>
                      <div className="space-y-2"><Label>Repetir até</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.recurrence_end_date && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />{form.recurrence_end_date ? format(form.recurrence_end_date, "dd/MM/yyyy") : "Selecione"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={form.recurrence_end_date || undefined} onSelect={(d) => setForm({ ...form, recurrence_end_date: d || null })} disabled={(d) => d < form.appointment_date} initialFocus className="p-3 pointer-events-auto" />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending || !form.doctor_id || !form.start_time || !form.title}>
                  {createMutation.isPending ? "Salvando..." : "Agendar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, -7))}><ChevronLeft className="h-5 w-5" /></Button>
            <div className="text-center">
              <p className="font-semibold">{format(weekStart, "dd MMM", { locale: ptBR })} — {format(weekEnd, "dd MMM yyyy", { locale: ptBR })}</p>
              <button className="text-xs text-primary hover:underline" onClick={() => setCurrentDate(new Date())}>Hoje</button>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 7))}><ChevronRight className="h-5 w-5" /></Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-8 border-b border-border">
              <div className="p-2 text-xs text-muted-foreground" />
              {weekDays.map((day) => (
                <div key={day.toISOString()} className={cn("p-2 text-center border-l border-border", isSameDay(day, new Date()) && "bg-primary/5")}>
                  <p className="text-xs text-muted-foreground">{format(day, "EEE", { locale: ptBR })}</p>
                  <p className={cn("text-sm font-semibold", isSameDay(day, new Date()) && "text-primary")}>{format(day, "dd")}</p>
                </div>
              ))}
            </div>
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-border/50 min-h-[60px]">
                <div className="p-1 text-xs text-muted-foreground text-right pr-2 pt-1">{String(hour).padStart(2, "0")}:00</div>
                {weekDays.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const dayApps = filteredAppointments.filter((a) => a.appointment_date === dateStr && parseInt(a.start_time.split(":")[0]) === hour);
                  return (
                    <div key={day.toISOString()} className={cn("border-l border-border/50 p-0.5", isSameDay(day, new Date()) && "bg-primary/5")}>
                      {dayApps.map((app) => (
                        <button key={app.id} onClick={() => setDetailAppointment(app)}
                          className="w-full text-left rounded px-1.5 py-0.5 text-xs mb-0.5 truncate border-l-2 cursor-pointer hover:opacity-80 bg-card"
                          style={{ borderColor: app.doctors?.color || "hsl(var(--primary))" }}>
                          <span className="font-medium">{app.start_time.slice(0, 5)}</span>{" "}
                          <span className="text-muted-foreground">{app.title}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detailAppointment} onOpenChange={() => setDetailAppointment(null)}>
        <DialogContent>
          {detailAppointment && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: detailAppointment.doctors?.color }} />
                  {detailAppointment.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Doutora</span><span>{detailAppointment.doctors?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Paciente</span><span>{detailAppointment.patients?.name || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Procedimento</span><span>{(detailAppointment as any).procedures?.name || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Data</span><span>{format(new Date(detailAppointment.appointment_date + "T12:00:00"), "dd/MM/yyyy")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Horário</span><span>{detailAppointment.start_time.slice(0, 5)} – {detailAppointment.end_time.slice(0, 5)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={STATUS_COLORS[detailAppointment.status]}>{STATUS_LABELS[detailAppointment.status]}</Badge></div>
                {detailAppointment.description && <div><span className="text-muted-foreground">Descrição:</span><p className="mt-1">{detailAppointment.description}</p></div>}
                <div className="flex flex-wrap gap-2 pt-2">
                  {["confirmed", "completed", "no_show", "cancelled"].filter(s => s !== detailAppointment.status).map((s) => (
                    <Button key={s} size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: detailAppointment.id, status: s })}>
                      {STATUS_LABELS[s]}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
