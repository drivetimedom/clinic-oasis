import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { Plus, ArrowDownCircle, ArrowUpCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type Movement = {
  id: string;
  product_id: string;
  type: string;
  quantity: number;
  date: string;
  responsible: string | null;
  notes: string | null;
};

type Product = { id: string; name: string; unit: string };

const TYPE_LABELS: Record<string, string> = {
  entry: "Entrada",
  exit: "Saída",
  adjustment: "Ajuste",
};

const TYPE_ICONS: Record<string, any> = {
  entry: ArrowDownCircle,
  exit: ArrowUpCircle,
  adjustment: RefreshCw,
};

export default function StockMovements() {
  const { currentClinic } = useClinic();
  const queryClient = useQueryClient();
  const clinicId = currentClinic?.id;
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [type, setType] = useState("entry");
  const [quantity, setQuantity] = useState("");
  const [responsible, setResponsible] = useState("");
  const [notes, setNotes] = useState("");
  const [filterProduct, setFilterProduct] = useState("all");

  const { data: products = [] } = useQuery({
    queryKey: ["stock_products_active", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_products")
        .select("id, name, unit")
        .eq("clinic_id", clinicId!)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!clinicId,
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ["stock_products_all_names", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_products")
        .select("id, name, unit")
        .eq("clinic_id", clinicId!)
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!clinicId,
  });

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["stock_movements", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*")
        .eq("clinic_id", clinicId!)
        .order("date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Movement[];
    },
    enabled: !!clinicId,
  });

  const filtered = filterProduct === "all" ? movements : movements.filter((m) => m.product_id === filterProduct);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("stock_movements").insert({
        clinic_id: clinicId!,
        product_id: productId,
        type,
        quantity: parseFloat(quantity),
        responsible: responsible || null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock_movements"] });
      queryClient.invalidateQueries({ queryKey: ["stock_products"] });
      toast.success("Movimentação registrada");
      resetForm();
    },
    onError: () => toast.error("Erro ao registrar movimentação"),
  });

  const resetForm = () => {
    setOpen(false);
    setProductId("");
    setType("entry");
    setQuantity("");
    setResponsible("");
    setNotes("");
  };

  const getProductName = (id: string) => allProducts.find((p) => p.id === id)?.name || "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Movimentações de Estoque</h1>
          <p className="text-muted-foreground">Registre entradas, saídas e ajustes de estoque</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Movimentação</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Movimentação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Produto *</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entrada (compra/reposição)</SelectItem>
                    <SelectItem value="exit">Saída (uso em procedimento)</SelectItem>
                    <SelectItem value="adjustment">Ajuste de estoque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantidade *</Label>
                <Input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Nome do responsável" />
              </div>
              <div className="space-y-2">
                <Label>Observação</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalhes da movimentação" />
              </div>
              <Button onClick={() => saveMutation.mutate()} disabled={!productId || !quantity || saveMutation.isPending} className="w-full">
                {saveMutation.isPending ? "Salvando..." : "Registrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3">
        <Label>Filtrar por produto:</Label>
        <Select value={filterProduct} onValueChange={setFilterProduct}>
          <SelectTrigger className="w-[250px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {allProducts.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhuma movimentação registrada</TableCell></TableRow>
              ) : (
                filtered.map((m) => {
                  const Icon = TYPE_ICONS[m.type] || RefreshCw;
                  return (
                    <TableRow key={m.id}>
                      <TableCell>{format(new Date(m.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                      <TableCell className="font-medium">{getProductName(m.product_id)}</TableCell>
                      <TableCell>
                        <Badge variant={m.type === "entry" ? "default" : m.type === "exit" ? "destructive" : "secondary"} className="gap-1">
                          <Icon className="h-3 w-3" />
                          {TYPE_LABELS[m.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>{m.quantity}</TableCell>
                      <TableCell className="text-muted-foreground">{m.responsible || "—"}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">{m.notes || "—"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
