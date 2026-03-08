import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

type Procedure = {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  duration_minutes: number | null;
  suggested_price: number | null;
  active: boolean;
};

type Category = { id: string; name: string; active: boolean };

export default function Procedures() {
  const { currentClinic } = useClinic();
  const queryClient = useQueryClient();
  const clinicId = currentClinic?.id;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Procedure | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const { data: categories = [] } = useQuery({
    queryKey: ["procedure_categories", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procedure_categories")
        .select("id, name, active")
        .eq("clinic_id", clinicId!)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!clinicId,
  });

  const { data: allCategories = [] } = useQuery({
    queryKey: ["procedure_categories_all", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procedure_categories")
        .select("id, name, active")
        .eq("clinic_id", clinicId!)
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!clinicId,
  });

  const { data: procedures = [], isLoading } = useQuery({
    queryKey: ["procedures", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procedures")
        .select("*")
        .eq("clinic_id", clinicId!)
        .order("name");
      if (error) throw error;
      return data as Procedure[];
    },
    enabled: !!clinicId,
  });

  const filtered = filterCategory === "all"
    ? procedures
    : procedures.filter((p) => p.category_id === filterCategory);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        description: description || null,
        category_id: categoryId,
        duration_minutes: duration ? parseInt(duration) : null,
        suggested_price: price ? parseFloat(price) : null,
        clinic_id: clinicId!,
      };
      if (editing) {
        const { error } = await supabase.from("procedures").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("procedures").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procedures"] });
      toast.success(editing ? "Procedimento atualizado" : "Procedimento criado");
      resetForm();
    },
    onError: () => toast.error("Erro ao salvar procedimento"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("procedures").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procedures"] });
      toast.success("Status atualizado");
    },
  });

  const resetForm = () => {
    setOpen(false);
    setEditing(null);
    setName("");
    setDescription("");
    setCategoryId("");
    setDuration("");
    setPrice("");
  };

  const openEdit = (proc: Procedure) => {
    setEditing(proc);
    setName(proc.name);
    setDescription(proc.description || "");
    setCategoryId(proc.category_id);
    setDuration(proc.duration_minutes?.toString() || "");
    setPrice(proc.suggested_price?.toString() || "");
    setOpen(true);
  };

  const getCategoryName = (id: string) => allCategories.find((c) => c.id === id)?.name || "—";

  const formatCurrency = (v: number | null) =>
    v != null ? `R$ ${v.toFixed(2).replace(".", ",")}` : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Procedimentos</h1>
          <p className="text-muted-foreground">Gerencie os procedimentos da clínica</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Procedimento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Procedimento" : "Novo Procedimento"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Aplicação de Toxina Botulínica" />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duração (min)</Label>
                  <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="60" />
                </div>
                <div className="space-y-2">
                  <Label>Preço sugerido (R$)</Label>
                  <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" />
                </div>
              </div>
              <Button onClick={() => saveMutation.mutate()} disabled={!name.trim() || !categoryId || saveMutation.isPending} className="w-full">
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3">
        <Label>Filtrar por categoria:</Label>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[250px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {allCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum procedimento cadastrado</TableCell></TableRow>
              ) : (
                filtered.map((proc) => (
                  <TableRow key={proc.id}>
                    <TableCell className="font-medium">{proc.name}</TableCell>
                    <TableCell>{getCategoryName(proc.category_id)}</TableCell>
                    <TableCell>{proc.duration_minutes ? `${proc.duration_minutes} min` : "—"}</TableCell>
                    <TableCell>{formatCurrency(proc.suggested_price)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={proc.active} onCheckedChange={(checked) => toggleMutation.mutate({ id: proc.id, active: checked })} />
                        <Badge variant={proc.active ? "default" : "secondary"}>{proc.active ? "Ativo" : "Inativo"}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(proc)}><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
