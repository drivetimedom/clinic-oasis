import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

type Category = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};

export default function ProcedureCategories() {
  const { currentClinic } = useClinic();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const clinicId = currentClinic?.id;

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["procedure_categories", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procedure_categories")
        .select("*")
        .eq("clinic_id", clinicId!)
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!clinicId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase
          .from("procedure_categories")
          .update({ name, description: description || null })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("procedure_categories")
          .insert({ name, description: description || null, clinic_id: clinicId! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procedure_categories"] });
      toast.success(editing ? "Categoria atualizada" : "Categoria criada");
      resetForm();
    },
    onError: () => toast.error("Erro ao salvar categoria"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("procedure_categories")
        .update({ active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procedure_categories"] });
      toast.success("Status atualizado");
    },
  });

  const resetForm = () => {
    setOpen(false);
    setEditing(null);
    setName("");
    setDescription("");
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setName(cat.name);
    setDescription(cat.description || "");
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Categorias de Procedimentos</h1>
          <p className="text-muted-foreground">Organize seus procedimentos por categorias</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Categoria</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Toxina Botulínica" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição da categoria" />
              </div>
              <Button onClick={() => saveMutation.mutate()} disabled={!name.trim() || saveMutation.isPending} className="w-full">
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : categories.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhuma categoria cadastrada</TableCell></TableRow>
              ) : (
                categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-muted-foreground">{cat.description || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={cat.active}
                          onCheckedChange={(checked) => toggleMutation.mutate({ id: cat.id, active: checked })}
                        />
                        <Badge variant={cat.active ? "default" : "secondary"}>
                          {cat.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
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
