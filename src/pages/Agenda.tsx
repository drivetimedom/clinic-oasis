import { useState, useCallback, useMemo, useRef, DragEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClinic } from "@/contexts/ClinicContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, ChevronLeft, ChevronRight, CalendarIcon, Stethoscope, ListChecks, Clock, AlertTriangle } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";

type Appointment = Tables<"appointments"> & {
  doctors?: { name: string; color: string } | null;
  patients?: { name: string } | null;
  procedures?: { name: string; category_id: string; duration_minutes: number | null } | null;
};

type ProcedureWithCategory = {
  id: string;
  name: string;
  duration_minutes: number | null;
  category_id: string;
  procedure_categories?: { color: string; name: string } | null;
};

type WaitlistEntry = Tables<"waitlist"> & {
  patients?: { name: string } | null;
  procedures?: { name: string } | null;
  doctors?: { name: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  awaiting_confirmation: "Aguardando",
  scheduled: "Agendado",
  confirmed: "Confirmado",
  in_progress: "Em atendimento",
  completed: "Finalizado",
  cancelled: "Cancelado",
  no_show: "Faltou",
};

const STATUS_COLORS: Record<string, string> = {
  awaiting_confirmation: "bg-warning/20 text-warning",
  scheduled: "bg-info/20 text-info",
  confirmed: "bg-success/20 text-success",
  in_progress: "bg-primary/20 text-primary",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/20 text-destructive",
  no_show: "bg-destructive/20 text-destructive",
};

const HOUR_HEIGHT = 64; // px per hour
const HOURS_START = 7;
const HOURS_END = 21;
const HOURS = Array.from({ length: HOURS_END - HOURS_START }, (_, i) => i + HOURS_START);

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export default function Agenda() {
  const { user } = useAuth();
  const { currentClinic } = useClinic();
  const clinicId = currentClinic!.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [open, setOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null);
  const [cancelSuggestionOpen, setCancelSuggestionOpen] = useState(false);
  const [cancellingAppointment, setCancellingAppointment] = useState<Appointment | null>(null);
  const dragRef = useRef<{ id: string; offsetMin: number } | null>(null);

  const [form, setForm] = useState({
    doctor_id: "", patient_id: "", procedure_id: "", title: "", description: "",
    appointment_date: new Date(), start_time: "",
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const viewDays = viewMode === "week" ? eachDayOfInterval({ start: weekStart, end: weekEnd }) : [currentDate];

  // Date range for query
  const queryStart = viewMode === "week" ? weekStart : currentDate;
  const queryEnd = viewMode === "week" ? weekEnd : currentDate;

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
    queryKey: ["procedures_with_categories", clinicId],
    queryFn: async () => {
      const { data } = await supabase
        .from("procedures")
        .select("id, name, duration_minutes, category_id, procedure_categories(color, name)")
        .eq("clinic_id", clinicId).eq("active", true).order("name");
      return (data || []) as ProcedureWithCategory[];
    },
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments", clinicId, format(queryStart, "yyyy-MM-dd"), format(queryEnd, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("*, doctors(name, color), patients(name), procedures(name, category_id, duration_minutes)")
        .eq("clinic_id", clinicId)
        .gte("appointment_date", format(queryStart, "yyyy-MM-dd"))
        .lte("appointment_date", format(queryEnd, "yyyy-MM-dd"))
        .neq("status", "cancelled").order("start_time");
      return (data || []) as Appointment[];
    },
  });

  const { data: waitlistEntries = [] } = useQuery({
    queryKey: ["waitlist", clinicId],
    queryFn: async () => {
      const { data } = await supabase
        .from("waitlist").select("*, patients(name), procedures(name), doctors(name)")
        .eq("clinic_id", clinicId).eq("status", "waiting").order("created_at");
      return (data || []) as WaitlistEntry[];
    },
  });

  // Build a map of procedure category colors
  const procedureCategoryColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    clinicProcedures.forEach((p) => {
      if (p.procedure_categories?.color) {
        map[p.id] = p.procedure_categories.color;
      }
    });
    return map;
  }, [clinicProcedures]);

  const getAppointmentColor = useCallback((app: Appointment): string => {
    if (app.procedure_id && procedureCategoryColorMap[app.procedure_id]) {
      return procedureCategoryColorMap[app.procedure_id];
    }
    return app.doctors?.color || "#3b82f6";
  }, [procedureCategoryColorMap]);

  // Conflict detection
  const hasConflict = useCallback((doctorId: string, date: string, startTime: string, endTime: string, excludeId?: string): boolean => {
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    return appointments.some((a) => {
      if (a.id === excludeId) return false;
      if (a.doctor_id !== doctorId || a.appointment_date !== date) return false;
      const aStart = timeToMinutes(a.start_time);
      const aEnd = timeToMinutes(a.end_time);
      return startMin < aEnd && endMin > aStart;
    });
  }, [appointments]);

  // Auto-calculate end time based on procedure duration
  const getEndTime = useCallback((startTime: string, procedureId: string | null): string => {
    if (!startTime) return "";
    const proc = clinicProcedures.find((p) => p.id === procedureId);
    const duration = proc?.duration_minutes || 60;
    const startMin = timeToMinutes(startTime);
    return minutesToTime(startMin + duration);
  }, [clinicProcedures]);

  // Selected procedure duration label
  const selectedProcedureDuration = form.procedure_id
    ? clinicProcedures.find((p) => p.id === form.procedure_id)?.duration_minutes
    : null;

  const createMutation = useMutation({
    mutationFn: async () => {
      const endTime = getEndTime(form.start_time, form.procedure_id || null);
      const dateStr = format(form.appointment_date, "yyyy-MM-dd");

      if (hasConflict(form.doctor_id, dateStr, form.start_time, endTime)) {
        throw new Error("Conflito de horário! Já existe um agendamento para este profissional neste horário.");
      }

      if (editingAppointment) {
        const { error } = await supabase.from("appointments").update({
          doctor_id: form.doctor_id, patient_id: form.patient_id || null,
          procedure_id: form.procedure_id || null, title: form.title,
          description: form.description || null, appointment_date: dateStr,
          start_time: form.start_time, end_time: endTime,
        }).eq("id", editingAppointment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("appointments").insert({
          user_id: user!.id, clinic_id: clinicId, doctor_id: form.doctor_id,
          patient_id: form.patient_id || null, procedure_id: form.procedure_id || null,
          title: form.title, description: form.description || null,
          appointment_date: dateStr, start_time: form.start_time, end_time: endTime,
          status: "awaiting_confirmation",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      closeForm();
      toast({ title: editingAppointment ? "Agendamento atualizado!" : "Agendamento criado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, newDate, newStartTime, newDoctorId }: { id: string; newDate: string; newStartTime: string; newDoctorId: string }) => {
      const app = appointments.find((a) => a.id === id);
      if (!app) throw new Error("Agendamento não encontrado");
      const duration = timeToMinutes(app.end_time) - timeToMinutes(app.start_time);
      const newEndTime = minutesToTime(timeToMinutes(newStartTime) + duration);

      if (hasConflict(newDoctorId, newDate, newStartTime, newEndTime, id)) {
        throw new Error("Conflito de horário no novo destino!");
      }

      const { error } = await supabase.from("appointments").update({
        appointment_date: newDate, start_time: newStartTime, end_time: newEndTime, doctor_id: newDoctorId,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Agendamento movido!" });
    },
    onError: (e: any) => toast({ title: "Erro ao mover", description: e.message, variant: "destructive" }),
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

  const closeForm = () => {
    setOpen(false);
    setEditingAppointment(null);
    setForm({ doctor_id: "", patient_id: "", procedure_id: "", title: "", description: "", appointment_date: new Date(), start_time: "" });
  };

  const openEdit = (app: Appointment) => {
    setEditingAppointment(app);
    setForm({
      doctor_id: app.doctor_id, patient_id: app.patient_id || "",
      procedure_id: app.procedure_id || "", title: app.title,
      description: app.description || "",
      appointment_date: new Date(app.appointment_date + "T12:00:00"),
      start_time: app.start_time.slice(0, 5),
    });
    setDetailAppointment(null);
    setOpen(true);
  };

  const handleCancelWithSuggestion = (app: Appointment) => {
    setCancellingAppointment(app);
    setCancelSuggestionOpen(true);
  };

  const confirmCancel = async () => {
    if (!cancellingAppointment) return;
    await updateStatusMutation.mutateAsync({ id: cancellingAppointment.id, status: "cancelled" });
    setCancelSuggestionOpen(false);
    setDetailAppointment(null);
  };

  const convertWaitlistToAppointment = async (entry: WaitlistEntry) => {
    if (!cancellingAppointment) return;
    const { error } = await supabase.from("appointments").insert({
      user_id: user!.id, clinic_id: clinicId,
      doctor_id: cancellingAppointment.doctor_id, patient_id: entry.patient_id,
      procedure_id: entry.procedure_id || cancellingAppointment.procedure_id,
      title: entry.procedures?.name || cancellingAppointment.title,
      appointment_date: cancellingAppointment.appointment_date,
      start_time: cancellingAppointment.start_time, end_time: cancellingAppointment.end_time,
      status: "awaiting_confirmation",
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    await supabase.from("waitlist").update({ status: "scheduled" }).eq("id", entry.id);
    await supabase.from("appointments").update({ status: "cancelled" }).eq("id", cancellingAppointment.id);
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
    queryClient.invalidateQueries({ queryKey: ["waitlist"] });
    setCancelSuggestionOpen(false);
    setDetailAppointment(null);
    toast({ title: "Paciente da lista de espera agendado!" });
  };

  const matchingWaitlist = cancellingAppointment
    ? waitlistEntries.filter((w) => {
        const matchDoctor = !w.doctor_id || w.doctor_id === cancellingAppointment.doctor_id;
        const matchProcedure = !w.procedure_id || w.procedure_id === cancellingAppointment.procedure_id;
        return matchDoctor && matchProcedure;
      })
    : [];

  // Drag and drop handlers
  const handleDragStart = (e: DragEvent, appId: string, startTime: string) => {
    e.dataTransfer.setData("text/plain", appId);
    e.dataTransfer.effectAllowed = "move";
    dragRef.current = { id: appId, offsetMin: 0 };
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: DragEvent, hour: number, doctorId: string, dateStr: string) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData("text/plain");
    if (!appId) return;

    // Calculate drop position within the hour cell
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const quarterSnap = Math.round(relativeY / (HOUR_HEIGHT / 4));
    const minuteOffset = Math.min(quarterSnap * 15, 45);
    const newStartTime = minutesToTime(hour * 60 + minuteOffset);

    moveMutation.mutate({ id: appId, newDate: dateStr, newStartTime, newDoctorId: doctorId });
    dragRef.current = null;
  };

  // Open form with pre-filled time slot on click
  const handleSlotClick = (hour: number, doctorId: string, date: Date) => {
    setForm({
      ...form,
      doctor_id: doctorId,
      appointment_date: date,
      start_time: minutesToTime(hour * 60),
    });
    setEditingAppointment(null);
    setOpen(true);
  };

  const allStatuses = ["awaiting_confirmation", "scheduled", "confirmed", "in_progress", "completed", "no_show", "cancelled"];

  // Auto-fill title when procedure selected
  const handleProcedureChange = (procId: string) => {
    const proc = clinicProcedures.find((p) => p.id === procId);
    setForm({
      ...form,
      procedure_id: procId,
      title: form.title || proc?.name || "",
    });
  };

  // Generate available time slots
  const availableTimeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = HOURS_START; h < HOURS_END; h++) {
      for (let m = 0; m < 60; m += 15) {
        slots.push(minutesToTime(h * 60 + m));
      }
    }
    return slots;
  }, []);

  // Check conflict for current form
  const formEndTime = form.start_time ? getEndTime(form.start_time, form.procedure_id || null) : "";
  const formConflict = form.doctor_id && form.start_time && formEndTime
    ? hasConflict(form.doctor_id, format(form.appointment_date, "yyyy-MM-dd"), form.start_time, formEndTime, editingAppointment?.id)
    : false;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Agenda Inteligente</h1>
          <p className="page-subtitle">Gerencie atendimentos por profissional</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/waitlist">
            <Button variant="outline" size="sm"><ListChecks className="h-4 w-4 mr-2" />Lista de Espera</Button>
          </Link>
          <Dialog open={open} onOpenChange={(v) => { if (!v) closeForm(); else setOpen(true); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Agendar</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingAppointment ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Profissional *</Label>
                  <Select value={form.doctor_id} onValueChange={(v) => setForm({ ...form, doctor_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />{d.name}</div>
                      </SelectItem>
                    ))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Paciente</Label>
                  <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                    <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Procedimento</Label>
                  <Select value={form.procedure_id} onValueChange={handleProcedureChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                    <SelectContent>{clinicProcedures.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.procedure_categories?.color || "#888" }} />
                          {p.name}
                          {p.duration_minutes && <span className="text-muted-foreground text-xs">({p.duration_minutes}min)</span>}
                        </div>
                      </SelectItem>
                    ))}</SelectContent>
                  </Select>
                  {selectedProcedureDuration && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />Duração: {selectedProcedureDuration} min — horário bloqueado automaticamente
                    </p>
                  )}
                </div>
                <div className="space-y-2"><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Ex: Consulta, Preenchimento..." /></div>
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />{format(form.appointment_date, "dd/MM/yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={form.appointment_date} onSelect={(d) => d && setForm({ ...form, appointment_date: d })} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Horário *</Label>
                  <Select value={form.start_time} onValueChange={(v) => setForm({ ...form, start_time: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o horário" /></SelectTrigger>
                    <SelectContent className="max-h-60">{availableTimeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}</SelectContent>
                  </Select>
                  {form.start_time && formEndTime && (
                    <p className="text-xs text-muted-foreground">{form.start_time} → {formEndTime}</p>
                  )}
                </div>
                {formConflict && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Conflito! Já existe agendamento para este profissional neste horário.
                  </div>
                )}
                <div className="space-y-2"><Label>Observações</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending || !form.doctor_id || !form.start_time || !form.title || formConflict}>
                  {createMutation.isPending ? "Salvando..." : editingAppointment ? "Atualizar" : "Agendar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* View toggle + date navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex items-center gap-0.5 p-0.5 rounded-[10px] bg-foreground/[0.04] border border-border">
          {([["day", "Dia"], ["week", "Semana"]] as const).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-3 py-1 text-[12.5px] font-medium rounded-[8px] transition-colors duration-[180ms]",
                viewMode === mode ? "bg-foreground/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, viewMode === "week" ? -7 : -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button className="text-[13.5px] font-medium px-3 py-1.5 rounded-[10px] hover:bg-foreground/[0.05] transition-colors duration-[180ms] capitalize" onClick={() => setCurrentDate(new Date())}>
            {viewMode === "week"
              ? `${format(weekStart, "dd MMM", { locale: ptBR })} — ${format(weekEnd, "dd MMM yyyy", { locale: ptBR })}`
              : format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
            }
          </button>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, viewMode === "week" ? 7 : 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {/* Status legend */}
        <div className="flex flex-wrap gap-1.5">
          {["awaiting_confirmation", "confirmed", "in_progress", "completed", "cancelled"].map((s) => (
            <Badge key={s} variant="secondary" className={cn("text-[10px] px-1.5 py-0", STATUS_COLORS[s])}>{STATUS_LABELS[s]}</Badge>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          {viewMode === "day" ? (
            <DayView
              date={currentDate}
              doctors={doctors}
              appointments={appointments}
              getAppointmentColor={getAppointmentColor}
              onAppointmentClick={setDetailAppointment}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onSlotClick={handleSlotClick}
            />
          ) : (
            <WeekView
              days={viewDays}
              doctors={doctors}
              appointments={appointments}
              getAppointmentColor={getAppointmentColor}
              onAppointmentClick={setDetailAppointment}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onSlotClick={handleSlotClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detailAppointment} onOpenChange={() => setDetailAppointment(null)}>
        <DialogContent>
          {detailAppointment && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getAppointmentColor(detailAppointment) }} />
                  {detailAppointment.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Profissional</span><span>{detailAppointment.doctors?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Paciente</span><span>{detailAppointment.patients?.name || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Procedimento</span><span>{detailAppointment.procedures?.name || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Data</span><span>{format(new Date(detailAppointment.appointment_date + "T12:00:00"), "dd/MM/yyyy")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Horário</span><span>{detailAppointment.start_time.slice(0, 5)} – {detailAppointment.end_time.slice(0, 5)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={STATUS_COLORS[detailAppointment.status]}>{STATUS_LABELS[detailAppointment.status]}</Badge></div>
                {detailAppointment.description && <div><span className="text-muted-foreground">Obs:</span><p className="mt-1">{detailAppointment.description}</p></div>}
                
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(detailAppointment)} className="flex-1">Editar</Button>
                  {detailAppointment.patient_id && (
                    <Button size="sm" className="flex-1" onClick={() => { setDetailAppointment(null); navigate(`/consultation/${detailAppointment.patient_id}`); }}>
                      <Stethoscope className="h-4 w-4 mr-1" />Consulta
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {allStatuses.filter(s => s !== detailAppointment.status && s !== "cancelled").map((s) => (
                    <Button key={s} size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatusMutation.mutate({ id: detailAppointment.id, status: s })}>
                      {STATUS_LABELS[s]}
                    </Button>
                  ))}
                  {detailAppointment.status !== "cancelled" && (
                    <Button size="sm" variant="outline" className="text-xs h-7 text-destructive border-destructive/30" onClick={() => handleCancelWithSuggestion(detailAppointment)}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel with waitlist suggestion dialog */}
      <Dialog open={cancelSuggestionOpen} onOpenChange={setCancelSuggestionOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancelar Agendamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {matchingWaitlist.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">Pacientes da lista de espera compatíveis:</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {matchingWaitlist.map((w) => (
                    <Card key={w.id} className="p-3 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => convertWaitlistToAppointment(w)}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm">{w.patients?.name}</p>
                          <p className="text-xs text-muted-foreground">{w.procedures?.name || "Qualquer procedimento"}</p>
                        </div>
                        <Button size="sm" variant="outline">Agendar</Button>
                      </div>
                    </Card>
                  ))}
                </div>
                <div className="border-t border-border pt-3">
                  <Button variant="destructive" className="w-full" onClick={confirmCancel}>Cancelar sem substituir</Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Nenhum paciente compatível na lista de espera.</p>
                <Button variant="destructive" className="w-full" onClick={confirmCancel}>Confirmar cancelamento</Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== Day View Component =====
function DayView({ date, doctors, appointments, getAppointmentColor, onAppointmentClick, onDragStart, onDragOver, onDrop, onSlotClick }: {
  date: Date;
  doctors: any[];
  appointments: Appointment[];
  getAppointmentColor: (a: Appointment) => string;
  onAppointmentClick: (a: Appointment) => void;
  onDragStart: (e: DragEvent, id: string, startTime: string) => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent, hour: number, doctorId: string, dateStr: string) => void;
  onSlotClick: (hour: number, doctorId: string, date: Date) => void;
}) {
  const dateStr = format(date, "yyyy-MM-dd");
  const dayApps = appointments.filter((a) => a.appointment_date === dateStr);

  return (
    <div className="min-w-[700px]">
      {/* Doctor headers */}
      <div className="grid border-b border-border sticky top-0 bg-surface/90 backdrop-blur-sm z-10" style={{ gridTemplateColumns: `60px repeat(${doctors.length}, 1fr)` }}>
        <div className="p-2.5 border-r border-border" />
        {doctors.map((d) => (
          <div key={d.id} className="p-2.5 text-center border-r border-border last:border-r-0">
            <div className="flex items-center justify-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-[12.5px] font-medium truncate tracking-[-0.01em]">{d.name}</span>
            </div>
          </div>
        ))}
      </div>
      {/* Time grid */}
      <div className="relative">
        {HOURS.map((hour) => (
          <div key={hour} className="grid border-b border-border" style={{ gridTemplateColumns: `60px repeat(${doctors.length}, 1fr)`, height: HOUR_HEIGHT }}>
            <div className="text-[10.5px] text-subtle text-right pr-2.5 pt-1 border-r border-border num tabular-nums">
              {String(hour).padStart(2, "0")}:00
            </div>
            {doctors.map((d) => {
              const doctorApps = dayApps.filter((a) => a.doctor_id === d.id && Math.floor(timeToMinutes(a.start_time) / 60) === hour);
              return (
                <div
                  key={d.id}
                  className="relative border-r border-border last:border-r-0 hover:bg-foreground/[0.025] transition-colors duration-[180ms] cursor-pointer"
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, hour, d.id, dateStr)}
                  onClick={() => onSlotClick(hour, d.id, date)}
                >
                  {/* Half-hour line */}
                  <div className="absolute left-0 right-0 border-t border-[hsl(0_0%_100%/0.025)]" style={{ top: HOUR_HEIGHT / 2 }} />
                  {dayApps.filter((a) => a.doctor_id === d.id).map((app) => {
                    const startMin = timeToMinutes(app.start_time);
                    const endMin = timeToMinutes(app.end_time);
                    const hourStart = hour * 60;
                    const hourEnd = (hour + 1) * 60;
                    // Only render in the cell where the appointment starts
                    if (startMin < hourStart || startMin >= hourEnd) return null;
                    const top = ((startMin - HOURS_START * 60) / 60) * HOUR_HEIGHT - (hour - HOURS_START) * HOUR_HEIGHT;
                    const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 20);
                    const color = getAppointmentColor(app);

                    return (
                      <div
                        key={app.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, app.id, app.start_time)}
                        onClick={(e) => { e.stopPropagation(); onAppointmentClick(app); }}
                        className="absolute left-1 right-1 rounded-[8px] px-2 py-1 overflow-hidden cursor-grab active:cursor-grabbing z-10 transition-all duration-[180ms] hover:brightness-125 hover:shadow-[0_4px_14px_-4px_rgba(0,0,0,0.6)]"
                        style={{
                          top,
                          height,
                          backgroundColor: color + "1f",
                          boxShadow: `inset 2px 0 0 ${color}`,
                        }}
                      >
                        <p className="text-[10.5px] font-medium truncate num" style={{ color }}>{app.start_time.slice(0, 5)} – {app.end_time.slice(0, 5)}</p>
                        <p className="text-[11.5px] truncate text-foreground/90 font-medium leading-tight">{app.patients?.name || app.title}</p>
                        {app.procedures?.name && <p className="text-[10px] truncate text-subtle leading-tight">{app.procedures.name}</p>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Week View Component =====
function WeekView({ days, doctors, appointments, getAppointmentColor, onAppointmentClick, onDragStart, onDragOver, onDrop, onSlotClick }: {
  days: Date[];
  doctors: any[];
  appointments: Appointment[];
  getAppointmentColor: (a: Appointment) => string;
  onAppointmentClick: (a: Appointment) => void;
  onDragStart: (e: DragEvent, id: string, startTime: string) => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent, hour: number, doctorId: string, dateStr: string) => void;
  onSlotClick: (hour: number, doctorId: string, date: Date) => void;
}) {
  // In weekly view, show appointments aggregated per day (no doctor columns to keep it manageable)
  return (
    <div className="min-w-[800px]">
      {/* Day headers */}
      <div className="grid border-b border-border sticky top-0 bg-surface/90 backdrop-blur-sm z-10" style={{ gridTemplateColumns: `60px repeat(${days.length}, 1fr)` }}>
        <div className="p-2.5 border-r border-border" />
        {days.map((day) => (
          <div key={day.toISOString()} className={cn("p-2.5 text-center border-r border-border last:border-r-0", isSameDay(day, new Date()) && "bg-primary/[0.06]")}>
            <p className="text-[10.5px] uppercase tracking-[0.08em] text-subtle">{format(day, "EEE", { locale: ptBR })}</p>
            <p className={cn("text-[15px] font-medium num mt-0.5", isSameDay(day, new Date()) && "text-primary")}>{format(day, "dd")}</p>
          </div>
        ))}
      </div>
      {/* Time grid */}
      {HOURS.map((hour) => (
        <div key={hour} className="grid border-b border-border" style={{ gridTemplateColumns: `60px repeat(${days.length}, 1fr)`, minHeight: HOUR_HEIGHT }}>
          <div className="text-[10.5px] text-subtle text-right pr-2.5 pt-1 border-r border-border num tabular-nums">
            {String(hour).padStart(2, "0")}:00
          </div>
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const hourApps = appointments.filter((a) => a.appointment_date === dateStr && Math.floor(timeToMinutes(a.start_time) / 60) === hour);
            return (
              <div
                key={day.toISOString()}
                className={cn("border-r border-border last:border-r-0 p-1 hover:bg-foreground/[0.025] transition-colors duration-[180ms] cursor-pointer relative", isSameDay(day, new Date()) && "bg-primary/[0.03]")}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, hour, hourApps[0]?.doctor_id || doctors[0]?.id, dateStr)}
                onClick={() => onSlotClick(hour, doctors[0]?.id || "", day)}
              >
                {hourApps.map((app) => {
                  const color = getAppointmentColor(app);
                  return (
                    <div
                      key={app.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, app.id, app.start_time)}
                      onClick={(e) => { e.stopPropagation(); onAppointmentClick(app); }}
                      className="w-full rounded-[8px] px-2 py-1 mb-1 text-xs cursor-grab active:cursor-grabbing transition-all duration-[180ms] hover:brightness-125"
                      style={{
                        backgroundColor: color + "1f",
                        boxShadow: `inset 2px 0 0 ${color}`,
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span className="font-medium num text-[10.5px]" style={{ color }}>{app.start_time.slice(0, 5)}</span>
                        <span className="truncate text-foreground/90 text-[11.5px]">{app.patients?.name || app.title}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
