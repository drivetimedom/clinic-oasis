import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Pencil, FileText } from "lucide-react";
import { toast } from "sonner";

type Protocol = {
  id: string;
  procedure_id: string;
  name: string;
  description: string | null;
  steps: string | null;
  clinical_notes: string | null;
  materials: string | null;
};

type Procedure = { id: string; name: string; active: boolean };

export default function Protocols() {
  const { currentClinic } = useClinic();
  const queryClient = useQueryClient();
  const clinicId = currentClinic?.id;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Protocol | null>(null);
  const [procedureId, setProcedureId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [materials, setMaterials] = useState("");
  const [filterProcedure, setFilterProcedure] = useState<string>("all");

  const { data: procedures = [] } = useQuery({
    queryKey: ["procedures_active", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procedures")
        .select("id, name, active")
        .eq("clinic_id", clinicId!)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as Procedure[];
    },
    enabled: !!clinicId,
  });

  const { data: allProcedures = [] } = useQuery({
    queryKey: ["procedures_all", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procedures")
        .select("id, name, active")
        .eq("clinic_id", clinicId!)
        .order("name");
      if (error) throw error;
      return data as Procedure[];
    },
    enabled: !!clinicId,
  });

  const { data: protocols = [], isLoading } = useQuery({
    queryKey: ["protocols", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("protocols")
        .select("*")
        .eq("clinic_id", clinicId!)
        .order("name");
      if (error) throw error;
      return data as Protocol[];
    },
    enabled: !!clinicId,
  });

  const filtered = filterProcedure === "all"
    ? protocols
    : protocols.filter((p) => p.procedure_id === filterProcedure);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        procedure_id: procedureId,
        description: description || null,
        steps: steps || null,
        clinical_notes: clinicalNotes || null,
        materials: materials || null,
        clinic_id: clinicId!,
      };
      if (editing) {
        const { error } = await supabase.from("protocols").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("protocols").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocols"] });
      toast.success(editing ? "Protocolo atualizado" : "Protocolo criado");
      resetForm();
    },
    onError: () => toast.error("Erro ao salvar protocolo"),
  });

  const resetForm = () => {
    setOpen(false);
    setEditing(null);
    setName("");
    setDescription("");
    setSteps("");
    setClinicalNotes("");
    setMaterials("");
    setProcedureId("");
  };

  const openEdit = (proto: Protocol) => {
    setEditing(proto);
    setName(proto.name);
    setDescription(proto.description || "");
    setSteps(proto.steps || "");
    setClinicalNotes(proto.clinical_notes || "");
    setMaterials(proto.materials || "");
    setProcedureId(proto.procedure_id);
    setOpen(true);
  };

  const getProcedureName = (id: string) => allProcedures.find((p) => p.id === id)?.name || "—";

  // Group protocols by procedure
  const grouped = filtered.reduce<Record<string, Protocol[]>>((acc, proto) => {
    const key = proto.procedure_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(proto);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Protocolos Clínicos</h1>
          <p className="text-muted-foreground">Instruções padronizadas para os procedimentos</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Protocolo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Protocolo" : "Novo Protocolo"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Procedimento</Label>
                <Select value={procedureId} onValueChange={setProcedureId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um procedimento" /></SelectTrigger>
                  <SelectContent>
                    {procedures.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nome do Protocolo</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Protocolo padrão de aplicação" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição geral do protocolo" />
              </div>
              <div className="space-y-2">
                <Label>Passo a passo</Label>
                <Textarea value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="1. Mapeamento facial&#10;2. Diluição&#10;3. Aplicação" rows={5} />
              </div>
              <div className="space-y-2">
                <Label>Observações clínicas</Label>
                <Textarea value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} placeholder="Cuidados especiais, contraindicações..." rows={3} />
              </div>
              <Button onClick={() => saveMutation.mutate()} disabled={!name.trim() || !procedureId || saveMutation.isPending} className="w-full">
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3">
        <Label>Filtrar por procedimento:</Label>
        <Select value={filterProcedure} onValueChange={setFilterProcedure}>
          <SelectTrigger className="w-[300px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {allProcedures.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      ) : Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum protocolo cadastrado
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([procId, protos]) => (
          <Card key={procId}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                {getProcedureName(procId)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {protos.map((proto) => (
                  <AccordionItem key={proto.id} value={proto.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <span>{proto.name}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pl-2">
                        {proto.description && (
                          <div>
                            <p className="text-sm font-medium text-foreground">Descrição</p>
                            <p className="text-sm text-muted-foreground">{proto.description}</p>
                          </div>
                        )}
                        {proto.steps && (
                          <div>
                            <p className="text-sm font-medium text-foreground">Passo a passo</p>
                            <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">{proto.steps}</pre>
                          </div>
                        )}
                        {proto.clinical_notes && (
                          <div>
                            <p className="text-sm font-medium text-foreground">Observações clínicas</p>
                            <p className="text-sm text-muted-foreground">{proto.clinical_notes}</p>
                          </div>
                        )}
                        <Button variant="outline" size="sm" onClick={() => openEdit(proto)}>
                          <Pencil className="h-3 w-3 mr-1" /> Editar
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
