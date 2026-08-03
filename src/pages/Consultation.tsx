import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Plus, User, Phone, Calendar, FileText, Stethoscope, Camera, FileSignature } from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Consultation() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { currentClinic } = useClinic();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const clinicId = currentClinic!.id;

  // Patient
  const { data: patient } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: async () => {
      const { data } = await supabase.from("patients").select("*").eq("id", patientId!).single();
      return data;
    },
    enabled: !!patientId,
  });

  // Last appointment
  const { data: lastAppointment } = useQuery({
    queryKey: ["last-appointment", patientId],
    queryFn: async () => {
      const { data } = await supabase.from("appointments").select("appointment_date")
        .eq("patient_id", patientId!).eq("clinic_id", clinicId).eq("status", "completed")
        .order("appointment_date", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!patientId,
  });

  // Evolutions
  const { data: evolutions = [] } = useQuery({
    queryKey: ["evolutions", patientId, clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("patient_evolutions").select("*, doctors(name)")
        .eq("patient_id", patientId!).eq("clinic_id", clinicId).order("evolution_date", { ascending: false });
      return data || [];
    },
    enabled: !!patientId,
  });

  // Facial assessments
  const { data: assessments = [] } = useQuery({
    queryKey: ["assessments", patientId, clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("facial_assessments").select("*, doctors(name)")
        .eq("patient_id", patientId!).eq("clinic_id", clinicId).order("assessment_date", { ascending: false });
      return data || [];
    },
    enabled: !!patientId,
  });

  // Patient procedures
  const { data: patientProcedures = [] } = useQuery({
    queryKey: ["patient-procedures", patientId, clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("patient_procedures").select("*, procedures(name), protocols(name), doctors(name)")
        .eq("patient_id", patientId!).eq("clinic_id", clinicId).order("procedure_date", { ascending: false });
      return data || [];
    },
    enabled: !!patientId,
  });

  // Photos
  const { data: photos = [] } = useQuery({
    queryKey: ["photos", patientId, clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("clinical_photos").select("*")
        .eq("patient_id", patientId!).eq("clinic_id", clinicId).order("photo_date", { ascending: false });
      return data || [];
    },
    enabled: !!patientId,
  });

  // Consent requests
  const { data: consents = [] } = useQuery({
    queryKey: ["consents", patientId, clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("consent_requests").select("*, consent_templates(title)")
        .eq("patient_id", patientId!).eq("clinic_id", clinicId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!patientId,
  });

  // Procedures and protocols for forms
  const { data: procedures = [] } = useQuery({
    queryKey: ["procedures-list", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("procedures").select("id, name").eq("clinic_id", clinicId).eq("active", true).order("name");
      return data || [];
    },
  });

  const { data: protocols = [] } = useQuery({
    queryKey: ["protocols-list", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("protocols").select("id, name, procedure_id").eq("clinic_id", clinicId).order("name");
      return data || [];
    },
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors-list", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("doctors").select("id, name").eq("clinic_id", clinicId).eq("active", true).order("name");
      return data || [];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["consent-templates", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("consent_templates").select("id, title").eq("clinic_id", clinicId).eq("active", true);
      return data || [];
    },
  });

  // New procedure form
  const [procOpen, setProcOpen] = useState(false);
  const [procForm, setProcForm] = useState({ procedure_id: "", protocol_id: "", doctor_id: "", area_treated: "", quantity_applied: "", clinical_notes: "" });

  const createProcMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("patient_procedures").insert({
        patient_id: patientId!, clinic_id: clinicId,
        procedure_id: procForm.procedure_id || null, protocol_id: procForm.protocol_id || null,
        doctor_id: procForm.doctor_id || null, area_treated: procForm.area_treated || null,
        quantity_applied: procForm.quantity_applied || null, clinical_notes: procForm.clinical_notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-procedures"] });
      setProcOpen(false);
      setProcForm({ procedure_id: "", protocol_id: "", doctor_id: "", area_treated: "", quantity_applied: "", clinical_notes: "" });
      toast({ title: "Procedimento registrado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // New evolution
  const [evoOpen, setEvoOpen] = useState(false);
  const [evoForm, setEvoForm] = useState({ description: "", doctor_id: "" });

  const createEvoMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("patient_evolutions").insert({
        patient_id: patientId!, clinic_id: clinicId,
        description: evoForm.description, doctor_id: evoForm.doctor_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evolutions"] });
      setEvoOpen(false);
      setEvoForm({ description: "", doctor_id: "" });
      toast({ title: "Evolução registrada!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Request consent
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentTemplateId, setConsentTemplateId] = useState("");

  const createConsentMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("consent_requests").insert({
        patient_id: patientId!, clinic_id: clinicId, template_id: consentTemplateId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consents"] });
      setConsentOpen(false);
      setConsentTemplateId("");
      toast({ title: "Solicitação de termo criada!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const age = patient?.birth_date ? differenceInYears(new Date(), new Date(patient.birth_date)) : null;

  const PHOTO_TYPE_LABELS: Record<string, string> = { before: "Antes", after: "Depois", followup: "Acompanhamento" };
  const CONSENT_STATUS: Record<string, string> = { pending: "Pendente", signed: "Assinado", expired: "Expirado" };

  if (!patient) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-lg bg-primary animate-pulse" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="page-title">Consulta</h1>
          <p className="text-muted-foreground text-sm">Tela de atendimento</p>
        </div>
      </div>

      {/* Patient info card */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 py-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-0.5">
            <p className="text-lg font-semibold">{patient.name}</p>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {age !== null && <span>{age} anos</span>}
              {patient.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{patient.phone}</span>}
              {lastAppointment && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />Último: {format(new Date(lastAppointment.appointment_date + "T12:00:00"), "dd/MM/yyyy")}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="prontuario">
        <TabsList className="w-full flex-wrap h-auto gap-1">
          <TabsTrigger value="prontuario" className="gap-1.5"><FileText className="h-4 w-4" />Prontuário</TabsTrigger>
          <TabsTrigger value="avaliacao" className="gap-1.5"><Stethoscope className="h-4 w-4" />Avaliação</TabsTrigger>
          <TabsTrigger value="procedimentos" className="gap-1.5"><Plus className="h-4 w-4" />Procedimentos</TabsTrigger>
          <TabsTrigger value="fotos" className="gap-1.5"><Camera className="h-4 w-4" />Fotos</TabsTrigger>
          <TabsTrigger value="termos" className="gap-1.5"><FileSignature className="h-4 w-4" />Termos</TabsTrigger>
        </TabsList>

        {/* Prontuário */}
        <TabsContent value="prontuario" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Evoluções</h3>
            <Dialog open={evoOpen} onOpenChange={setEvoOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Evolução</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Registrar Evolução</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createEvoMutation.mutate(); }} className="space-y-4">
                  <div className="space-y-2"><Label>Profissional</Label>
                    <Select value={evoForm.doctor_id} onValueChange={(v) => setEvoForm({ ...evoForm, doctor_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Descrição *</Label>
                    <Textarea value={evoForm.description} onChange={(e) => setEvoForm({ ...evoForm, description: e.target.value })} rows={4} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={createEvoMutation.isPending || !evoForm.description}>
                    {createEvoMutation.isPending ? "Salvando..." : "Registrar"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {evolutions.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma evolução registrada.</p> : (
            <div className="space-y-3">
              {evolutions.map((e: any) => (
                <Card key={e.id}>
                  <CardContent className="py-3 space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{format(new Date(e.evolution_date + "T12:00:00"), "dd/MM/yyyy")}</span>
                      <span>{e.doctors?.name || "—"}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{e.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Avaliação Clínica */}
        <TabsContent value="avaliacao" className="space-y-4">
          <h3 className="font-semibold">Avaliações Faciais</h3>
          {assessments.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma avaliação registrada.</p> : (
            <div className="space-y-3">
              {assessments.map((a: any) => (
                <Card key={a.id}>
                  <CardContent className="py-3 space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{format(new Date(a.assessment_date + "T12:00:00"), "dd/MM/yyyy")}</span>
                      <span>{a.doctors?.name || "—"}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {a.skin_type && <div><span className="text-muted-foreground">Pele:</span> {a.skin_type}</div>}
                      {a.wrinkles && <div><span className="text-muted-foreground">Rugas:</span> {a.wrinkles}</div>}
                      {a.flaccidity_level && <div><span className="text-muted-foreground">Flacidez:</span> {a.flaccidity_level}</div>}
                      {a.facial_asymmetry && <div><span className="text-muted-foreground">Assimetria:</span> {a.facial_asymmetry}</div>}
                      {a.lip_volume && <div><span className="text-muted-foreground">Lábios:</span> {a.lip_volume}</div>}
                      {a.malar_volume && <div><span className="text-muted-foreground">Malar:</span> {a.malar_volume}</div>}
                    </div>
                    {a.clinical_notes && <p className="text-sm text-muted-foreground">{a.clinical_notes}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Procedimentos */}
        <TabsContent value="procedimentos" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Procedimentos Realizados</h3>
            <Dialog open={procOpen} onOpenChange={setProcOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Registrar</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Registrar Procedimento</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createProcMutation.mutate(); }} className="space-y-4">
                  <div className="space-y-2"><Label>Procedimento</Label>
                    <Select value={procForm.procedure_id} onValueChange={(v) => setProcForm({ ...procForm, procedure_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{procedures.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Protocolo</Label>
                    <Select value={procForm.protocol_id} onValueChange={(v) => setProcForm({ ...procForm, protocol_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                      <SelectContent>{protocols.filter((p) => !procForm.procedure_id || p.procedure_id === procForm.procedure_id).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Profissional</Label>
                    <Select value={procForm.doctor_id} onValueChange={(v) => setProcForm({ ...procForm, doctor_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Área Tratada</Label><Input value={procForm.area_treated} onChange={(e) => setProcForm({ ...procForm, area_treated: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Quantidade Aplicada</Label><Input value={procForm.quantity_applied} onChange={(e) => setProcForm({ ...procForm, quantity_applied: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Observações Clínicas</Label><Textarea value={procForm.clinical_notes} onChange={(e) => setProcForm({ ...procForm, clinical_notes: e.target.value })} rows={3} /></div>
                  <Button type="submit" className="w-full" disabled={createProcMutation.isPending}>
                    {createProcMutation.isPending ? "Salvando..." : "Registrar Procedimento"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {patientProcedures.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum procedimento registrado.</p> : (
            <div className="space-y-3">
              {patientProcedures.map((p: any) => (
                <Card key={p.id}>
                  <CardContent className="py-3 space-y-1">
                    <div className="flex justify-between">
                      <span className="font-medium text-sm">{p.procedures?.name || "Procedimento"}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(p.procedure_date + "T12:00:00"), "dd/MM/yyyy")}</span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {p.protocols?.name && <div>Protocolo: {p.protocols.name}</div>}
                      {p.doctors?.name && <div>Profissional: {p.doctors.name}</div>}
                      {p.area_treated && <div>Área: {p.area_treated}</div>}
                      {p.quantity_applied && <div>Quantidade: {p.quantity_applied}</div>}
                    </div>
                    {p.clinical_notes && <p className="text-xs text-muted-foreground mt-1">{p.clinical_notes}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Fotos */}
        <TabsContent value="fotos" className="space-y-4">
          <h3 className="font-semibold">Fotos Clínicas</h3>
          {photos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma foto registrada.</p> : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((p: any) => (
                <Card key={p.id} className="overflow-hidden">
                  <img src={p.photo_url} alt="Foto clínica" className="w-full h-40 object-cover" />
                  <CardContent className="py-2 space-y-0.5">
                    <Badge variant="outline" className="text-[10px]">{PHOTO_TYPE_LABELS[p.photo_type] || p.photo_type}</Badge>
                    <p className="text-xs text-muted-foreground">{format(new Date(p.photo_date + "T12:00:00"), "dd/MM/yyyy")}</p>
                    {p.observation && <p className="text-xs">{p.observation}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Termos */}
        <TabsContent value="termos" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Termos de Consentimento</h3>
            <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Solicitar Termo</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Solicitar Assinatura de Termo</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createConsentMutation.mutate(); }} className="space-y-4">
                  <div className="space-y-2"><Label>Modelo de Termo *</Label>
                    <Select value={consentTemplateId} onValueChange={setConsentTemplateId}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={createConsentMutation.isPending || !consentTemplateId}>
                    {createConsentMutation.isPending ? "Enviando..." : "Solicitar Assinatura"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {consents.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum termo solicitado.</p> : (
            <div className="space-y-3">
              {consents.map((c: any) => (
                <Card key={c.id}>
                  <CardContent className="py-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{c.consent_templates?.title || "Termo"}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(c.created_at), "dd/MM/yyyy HH:mm")}</p>
                    </div>
                    <Badge variant={c.status === "signed" ? "default" : "outline"}>
                      {CONSENT_STATUS[c.status] || c.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
