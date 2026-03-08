import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, ChevronLeft, ChevronRight, CalendarIcon, X } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, addMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";

type Appointment = Tables<"appointments"> & {
  doctors?: { name: string; color: string } | null;
  patients?: { name: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-info/20 text-info",
  confirmed: "bg-success/20 text-success",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/20 text-destructive",
  no_show: "bg-warning/20 text-warning",
};

export default function Agenda() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null);

  const [form, setForm] = useState({
    doctor_id: "", patient_id: "", title: "", description: "",
    appointment_date: new Date(), start_time: "", end_time: "",
    is_recurring: false, recurrence_type: "weekly" as string, recurrence_end_date: null as Date | null,
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const { data } = await supabase.from("doctors").select("*").eq("user_id", user!.id).eq("active", true).order("name");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data } = await supabase.from("patients").select("id, name").eq("user_id", user!.id).order("name");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments", format(weekStart, "yyyy-MM-dd"), format(weekEnd, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("*, doctors(name, color), patients(name)")
        .eq("user_id", user!.id)
        .gte("appointment_date", format(weekStart, "yyyy-MM-dd"))
        .lte("appointment_date", format(weekEnd, "yyyy-MM-dd"))
        .neq("status", "cancelled")
        .order("start_time");
      return (data || []) as Appointment[];
    },
    enabled: !!user,
  });

  const { data: availabilitySlots = [] } = useQuery({
    queryKey: ["availability_slots"],
    queryFn: async () => {
      const { data } = await supabase.from("availability_slots").select("*").eq("user_id", user!.id).eq("active", true);
      return data || [];
    },
    enabled: !!user,
  });

  // Get available time slots for a specific date and doctor
  const getAvailableSlots = (date: Date, doctorId: string) => {
    const dayOfWeek = date.getDay();
    const doctorSlots = availabilitySlots.filter(
      (s) => s.doctor_id === doctorId && s.day_of_week === dayOfWeek
    );

    const timeSlots: string[] = [];
    doctorSlots.forEach((slot) => {
      const [startH, startM] = slot.start_time.split(":").map(Number);
      const [endH, endM] = slot.end_time.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      const duration = slot.slot_duration;

      for (let m = startMinutes; m + duration <= endMinutes; m += duration) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        timeSlots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
      }
    });

    // Filter out already booked slots
    const dateStr = format(date, "yyyy-MM-dd");
    const booked = appointments.filter(
      (a) => a.appointment_date === dateStr && a.doctor_id === doctorId
    );

    return timeSlots.filter((slot) => {
      return !booked.some((a) => a.start_time.slice(0, 5) === slot);
    });
  };

  const availableSlots = form.doctor_id && form.appointment_date
    ? getAvailableSlots(form.appointment_date, form.doctor_id)
    : [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const dateStr = format(form.appointment_date, "yyyy-MM-dd");
      const doctorSlot = availabilitySlots.find(
        (s) => s.doctor_id === form.doctor_id && s.day_of_week === form.appointment_date.getDay()
      );
      const duration = doctorSlot?.slot_duration || 60;
      const [h, m] = form.start_time.split(":").map(Number);
      const endMinutes = h * 60 + m + duration;
      const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

      if (form.is_recurring && form.recurrence_end_date) {
        // Create recurring appointments
        const groupId = crypto.randomUUID();
        const appointmentsToCreate: any[] = [];
        let currentAppDate = form.appointment_date;

        while (currentAppDate <= form.recurrence_end_date) {
          appointmentsToCreate.push({
            user_id: user!.id,
            doctor_id: form.doctor_id,
            patient_id: form.patient_id || null,
            title: form.title,
            description: form.description || null,
            appointment_date: format(currentAppDate, "yyyy-MM-dd"),
            start_time: form.start_time,
            end_time: endTime,
            is_recurring: true,
            recurrence_type: form.recurrence_type,
            recurrence_end_date: format(form.recurrence_end_date, "yyyy-MM-dd"),
            recurrence_group_id: groupId,
          });

          if (form.recurrence_type === "weekly") currentAppDate = addWeeks(currentAppDate, 1);
          else if (form.recurrence_type === "biweekly") currentAppDate = addWeeks(currentAppDate, 2);
          else currentAppDate = addMonths(currentAppDate, 1);
        }

        const { error } = await supabase.from("appointments").insert(appointmentsToCreate);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("appointments").insert({
          user_id: user!.id,
          doctor_id: form.doctor_id,
          patient_id: form.patient_id || null,
          title: form.title,
          description: form.description || null,
          appointment_date: dateStr,
          start_time: form.start_time,
          end_time: endTime,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setOpen(false);
      setForm({
        doctor_id: "", patient_id: "", title: "", description: "",
        appointment_date: new Date(), start_time: "", end_time: "",
        is_recurring: false, recurrence_type: "weekly", recurrence_end_date: null,
      });
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

  const filteredAppointments = selectedDoctor === "all"
    ? appointments
    : appointments.filter((a) => a.doctor_id === selectedDoctor);

  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7h to 20h

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Agenda</h1>
        <div className="flex items-center gap-3">
          <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as doutoras</SelectItem>
              {doctors.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Agendar</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Novo Agendamento</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Doutora *</Label>
                  <Select value={form.doctor_id} onValueChange={(v) => setForm({ ...form, doctor_id: v, start_time: "" })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {doctors.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                            {d.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Paciente</Label>
                  <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                    <SelectContent>
                      {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Ex: Consulta, Limpeza de pele..." />
                </div>

                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.appointment_date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(form.appointment_date, "dd/MM/yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={form.appointment_date}
                        onSelect={(d) => d && setForm({ ...form, appointment_date: d, start_time: "" })}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Horário Disponível *</Label>
                  {!form.doctor_id ? (
                    <p className="text-sm text-muted-foreground">Selecione a doutora primeiro</p>
                  ) : availableSlots.length === 0 ? (
                    <p className="text-sm text-warning">Nenhum horário disponível neste dia para esta doutora</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot}
                          type="button"
                          variant={form.start_time === slot ? "default" : "outline"}
                          size="sm"
                          onClick={() => setForm({ ...form, start_time: slot })}
                        >
                          {slot}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
                </div>

                <div className="space-y-3 border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_recurring} onCheckedChange={(v) => setForm({ ...form, is_recurring: v })} />
                    <Label>Evento Recorrente</Label>
                  </div>
                  {form.is_recurring && (
                    <div className="space-y-3">
                      <Select value={form.recurrence_type} onValueChange={(v) => setForm({ ...form, recurrence_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="biweekly">Quinzenal</SelectItem>
                          <SelectItem value="monthly">Mensal</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="space-y-2">
                        <Label>Repetir até</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.recurrence_end_date && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {form.recurrence_end_date ? format(form.recurrence_end_date, "dd/MM/yyyy") : "Selecione"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={form.recurrence_end_date || undefined}
                              onSelect={(d) => setForm({ ...form, recurrence_end_date: d || null })}
                              disabled={(d) => d < form.appointment_date}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending || !form.doctor_id || !form.start_time || !form.title}
                >
                  {createMutation.isPending ? "Salvando..." : "Agendar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Week navigation */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <p className="font-semibold">
                {format(weekStart, "dd MMM", { locale: ptBR })} — {format(weekEnd, "dd MMM yyyy", { locale: ptBR })}
              </p>
              <button className="text-xs text-primary hover:underline" onClick={() => setCurrentDate(new Date())}>
                Hoje
              </button>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header */}
            <div className="grid grid-cols-8 border-b border-border">
              <div className="p-2 text-xs text-muted-foreground text-center">Hora</div>
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "p-2 text-center border-l border-border",
                    isSameDay(day, new Date()) && "bg-primary/5"
                  )}
                >
                  <p className="text-xs text-muted-foreground">{format(day, "EEE", { locale: ptBR })}</p>
                  <p className={cn(
                    "text-sm font-semibold",
                    isSameDay(day, new Date()) && "text-primary"
                  )}>{format(day, "dd")}</p>
                </div>
              ))}
            </div>

            {/* Time grid */}
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-border min-h-[60px]">
                <div className="p-1 text-xs text-muted-foreground text-center flex items-start justify-center pt-1">
                  {String(hour).padStart(2, "0")}:00
                </div>
                {weekDays.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const hourApps = filteredAppointments.filter((a) => {
                    const appHour = parseInt(a.start_time.split(":")[0]);
                    return a.appointment_date === dateStr && appHour === hour;
                  });

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "border-l border-border p-0.5 relative",
                        isSameDay(day, new Date()) && "bg-primary/5"
                      )}
                    >
                      {hourApps.map((a) => (
                        <button
                          key={a.id}
                          className="w-full text-left p-1.5 rounded text-xs mb-0.5 truncate cursor-pointer hover:opacity-80 transition-opacity"
                          style={{
                            backgroundColor: `${a.doctors?.color || "#4ade80"}33`,
                            borderLeft: `3px solid ${a.doctors?.color || "#4ade80"}`,
                          }}
                          onClick={() => setDetailAppointment(a)}
                        >
                          <p className="font-medium truncate">{a.start_time.slice(0, 5)} {a.title}</p>
                          {a.patients?.name && <p className="truncate text-muted-foreground">{a.patients.name}</p>}
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

      {/* Appointment detail dialog */}
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
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Doutora:</span> <span className="font-medium">{detailAppointment.doctors?.name}</span></div>
                  <div><span className="text-muted-foreground">Paciente:</span> <span className="font-medium">{detailAppointment.patients?.name || "—"}</span></div>
                  <div><span className="text-muted-foreground">Data:</span> <span className="font-medium">{format(parseISO(detailAppointment.appointment_date), "dd/MM/yyyy")}</span></div>
                  <div><span className="text-muted-foreground">Horário:</span> <span className="font-medium">{detailAppointment.start_time.slice(0, 5)} – {detailAppointment.end_time.slice(0, 5)}</span></div>
                </div>
                {detailAppointment.description && (
                  <div className="text-sm"><span className="text-muted-foreground">Descrição:</span> <p>{detailAppointment.description}</p></div>
                )}
                {detailAppointment.is_recurring && (
                  <Badge variant="outline" className="gap-1">🔄 Recorrente ({detailAppointment.recurrence_type === "weekly" ? "Semanal" : detailAppointment.recurrence_type === "biweekly" ? "Quinzenal" : "Mensal"})</Badge>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge className={STATUS_COLORS[detailAppointment.status]}>{STATUS_LABELS[detailAppointment.status]}</Badge>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  {detailAppointment.status !== "confirmed" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: detailAppointment.id, status: "confirmed" })}>
                      Confirmar
                    </Button>
                  )}
                  {detailAppointment.status !== "completed" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: detailAppointment.id, status: "completed" })}>
                      Concluir
                    </Button>
                  )}
                  {detailAppointment.status !== "no_show" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: detailAppointment.id, status: "no_show" })}>
                      Não compareceu
                    </Button>
                  )}
                  {detailAppointment.status !== "cancelled" && (
                    <Button size="sm" variant="destructive" onClick={() => updateStatusMutation.mutate({ id: detailAppointment.id, status: "cancelled" })}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
