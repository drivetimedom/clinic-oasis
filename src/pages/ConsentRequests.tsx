import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Copy, Send, Trash2 } from "lucide-react";

const statusLabels: Record<string, string> = { pending: "Pendente", signed: "Assinado", expired: "Expirado" };
const statusColors: Record<string, string> = {
  pending: "bg-warning/20 text-warning",
  signed: "bg-success/20 text-success",
  expired: "bg-muted text-muted-foreground",
};

export default function ConsentRequests() {
  const { currentClinic } = useClinic();
  const clinicId = currentClinic!.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patient_id: "", template_id: "", procedure_id: "" });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients", clinicId],
    queryFn: async () => { const { data } = await supabase.from("patients").select("id, name, phone, email").eq("clinic_id", clinicId).order("name"); return data || []; },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["consent-templates-active", clinicId],
    queryFn: async () => { const { data } = await supabase.from("consent_templates").select("id, title").eq("clinic_id", clinicId).eq("active", true).order("title"); return data || []; },
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["consent-requests", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("consent_requests").select("*, patients(name, phone, email), consent_templates(title), procedures(name)").eq("clinic_id", clinicId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("consent_requests").insert({
        clinic_id: clinicId,
        patient_id: form.patient_id,
        template_id: form.template_id,
        procedure_id: form.procedure_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consent-requests"] });
      setOpen(false);
      setForm({ patient_id: "", template_id: "", procedure_id: "" });
      toast({ title: "Solicitação criada! Copie o link para enviar ao paciente." });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("consent_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consent-requests"] });
      toast({ title: "Solicitação removida!" });
    },
  });

  const getSignLink = (token: string) => `${window.location.origin}/consent/sign/${token}`;

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(getSignLink(token));
    toast({ title: "Link copiado!" });
  };

  const sendWhatsApp = (token: string, phone: string | null) => {
    if (!phone) { toast({ title: "Paciente sem telefone cadastrado", variant: "destructive" }); return; }
    const cleanPhone = phone.replace(/\D/g, "");
    const msg = encodeURIComponent(`Olá! Por favor, assine o termo de consentimento acessando o link: ${getSignLink(token)}`);
    window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Solicitações de Assinatura</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova Solicitação</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Enviar Termo para Assinatura</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Paciente</Label>
                <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{patients.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Modelo de Termo</Label>
                <Select value={form.template_id} onValueChange={(v) => setForm({ ...form, template_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "Enviando..." : "Criar Solicitação"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Paciente</TableHead><TableHead>Termo</TableHead><TableHead>Enviado em</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            : requests.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma solicitação</TableCell></TableRow>
            : requests.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.patients?.name || "—"}</TableCell>
                <TableCell>{r.consent_templates?.title || "—"}</TableCell>
                <TableCell>{formatDate(r.sent_at)}</TableCell>
                <TableCell><Badge className={statusColors[r.status] || ""}>{statusLabels[r.status] || r.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {r.status === "pending" && (
                      <>
                        <Button variant="ghost" size="icon" title="Copiar link" onClick={() => copyLink(r.token)}><Copy className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" title="Enviar via WhatsApp" onClick={() => sendWhatsApp(r.token, r.patients?.phone)}><Send className="h-4 w-4 text-success" /></Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" title="Excluir" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
