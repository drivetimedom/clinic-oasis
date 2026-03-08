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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Product = {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  description: string | null;
  quantity_in_stock: number;
  unit: string;
  min_stock: number;
  active: boolean;
};

const UNIT_OPTIONS = ["unidade", "ml", "caixa", "frasco", "ampola", "kit"];

export default function StockProducts() {
  const { currentClinic } = useClinic();
  const queryClient = useQueryClient();
  const clinicId = currentClinic?.id;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("unidade");
  const [minStock, setMinStock] = useState("0");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["stock_products", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_products")
        .select("*")
        .eq("clinic_id", clinicId!)
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!clinicId,
  });

  const lowStockProducts = products.filter((p) => p.active && p.quantity_in_stock <= p.min_stock);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        category: category || null,
        brand: brand || null,
        description: description || null,
        unit,
        min_stock: parseFloat(minStock) || 0,
        clinic_id: clinicId!,
      };
      if (editing) {
        const { error } = await supabase.from("stock_products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("stock_products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock_products"] });
      toast.success(editing ? "Produto atualizado" : "Produto criado");
      resetForm();
    },
    onError: () => toast.error("Erro ao salvar produto"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("stock_products").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock_products"] });
      toast.success("Status atualizado");
    },
  });

  const resetForm = () => {
    setOpen(false);
    setEditing(null);
    setName("");
    setCategory("");
    setBrand("");
    setDescription("");
    setUnit("unidade");
    setMinStock("0");
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setName(p.name);
    setCategory(p.category || "");
    setBrand(p.brand || "");
    setDescription(p.description || "");
    setUnit(p.unit);
    setMinStock(p.min_stock.toString());
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produtos em Estoque</h1>
          <p className="text-muted-foreground">Gerencie os produtos e materiais da clínica</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Produto</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Toxina Botulínica" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Toxinas" />
                </div>
                <div className="space-y-2">
                  <Label>Marca</Label>
                  <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ex: Allergan" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Unidade de medida</Label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Estoque mínimo</Label>
                  <Input type="number" value={minStock} onChange={(e) => setMinStock(e.target.value)} placeholder="0" />
                </div>
              </div>
              <Button onClick={() => saveMutation.mutate()} disabled={!name.trim() || saveMutation.isPending} className="w-full">
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {lowStockProducts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Estoque baixo</AlertTitle>
          <AlertDescription>
            {lowStockProducts.map((p) => p.name).join(", ")} — abaixo do estoque mínimo.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : products.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum produto cadastrado</TableCell></TableRow>
              ) : (
                products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.category || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.brand || "—"}</TableCell>
                    <TableCell>
                      <span className={p.quantity_in_stock <= p.min_stock ? "text-destructive font-semibold" : ""}>
                        {p.quantity_in_stock}
                      </span>
                    </TableCell>
                    <TableCell>{p.unit}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={p.active} onCheckedChange={(v) => toggleMutation.mutate({ id: p.id, active: v })} />
                        <Badge variant={p.active ? "default" : "secondary"}>{p.active ? "Ativo" : "Inativo"}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
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
