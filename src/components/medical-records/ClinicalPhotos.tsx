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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Camera, X, ZoomIn } from "lucide-react";

type Props = { patientId: string };

const PHOTO_TYPES: Record<string, string> = {
  before: "Antes",
  after: "Depois",
  followup: "Acompanhamento",
};

export default function ClinicalPhotos({ patientId }: Props) {
  const { currentClinic } = useClinic();
  const clinicId = currentClinic!.id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    photo_type: "followup", procedure_id: "", observation: "",
    photo_date: new Date().toISOString().split("T")[0],
  });
  const [file, setFile] = useState<File | null>(null);

  const { data: photos = [] } = useQuery({
    queryKey: ["clinical-photos", patientId, clinicId],
    queryFn: async () => {
      const { data } = await supabase
        .from("clinical_photos")
        .select("*, procedures(name)")
        .eq("patient_id", patientId)
        .eq("clinic_id", clinicId)
        .order("photo_date", { ascending: false });
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

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Selecione uma foto");
      setUploading(true);
      const ext = file.name.split(".").pop();
      const path = `${clinicId}/${patientId}/${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage.from("clinical-photos").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("clinical-photos").getPublicUrl(path);

      const { error } = await supabase.from("clinical_photos").insert({
        patient_id: patientId,
        clinic_id: clinicId,
        photo_url: urlData.publicUrl,
        photo_type: form.photo_type,
        procedure_id: form.procedure_id || null,
        observation: form.observation || null,
        photo_date: form.photo_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clinical-photos"] });
      setOpen(false);
      setFile(null);
      setForm({ photo_type: "followup", procedure_id: "", observation: "", photo_date: new Date().toISOString().split("T")[0] });
      toast({ title: "Foto adicionada!" });
      setUploading(false);
    },
    onError: (e: any) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
      setUploading(false);
    },
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5 text-primary" />Fotos Clínicas</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Adicionar Foto</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Adicionar Foto Clínica</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Foto *</Label>
                  <Input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input type="date" value={form.photo_date} onChange={e => setForm({ ...form, photo_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={form.photo_type} onValueChange={v => setForm({ ...form, photo_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PHOTO_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Procedimento Relacionado</Label>
                  <Select value={form.procedure_id} onValueChange={v => setForm({ ...form, procedure_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>{procedures.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Textarea value={form.observation} onChange={e => setForm({ ...form, observation: e.target.value })} rows={2} />
                </div>
              </div>
              <Button onClick={() => uploadMutation.mutate()} disabled={uploading || !file} className="w-full mt-4">
                {uploading ? "Enviando..." : "Salvar Foto"}
              </Button>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhuma foto registrada.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((p: any) => (
                <div key={p.id} className="group relative rounded-lg overflow-hidden border border-border cursor-pointer" onClick={() => setViewPhoto(p.photo_url)}>
                  <img src={p.photo_url} alt="Foto clínica" className="w-full aspect-square object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <Badge variant="secondary" className="text-[10px]">{PHOTO_TYPES[p.photo_type] || p.photo_type}</Badge>
                    <p className="text-[10px] text-white mt-1">{formatDate(p.photo_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo viewer */}
      <Dialog open={!!viewPhoto} onOpenChange={() => setViewPhoto(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <button onClick={() => setViewPhoto(null)} className="absolute top-2 right-2 z-10 bg-black/50 rounded-full p-1">
            <X className="h-5 w-5 text-white" />
          </button>
          {viewPhoto && <img src={viewPhoto} alt="Foto clínica" className="w-full h-auto" />}
        </DialogContent>
      </Dialog>
    </>
  );
}
