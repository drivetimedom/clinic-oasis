import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, AlertTriangle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type Batch = {
  id: string;
  product_id: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
};

type Product = { id: string; name: string };

export default function StockBatches() {
  const { currentClinic } = useClinic();
  const queryClient = useQueryClient();
  const clinicId = currentClinic?.id;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Batch | null>(null);
  const [productId, setProductId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [filterProduct, setFilterProduct] = useState("all");

  const { data: products = [] } = useQuery({
    queryKey: ["stock_products_active_batches", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_products")
        .select("id, name")
        .eq("clinic_id", clinicId!)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!clinicId,
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ["stock_products_all_batches", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_products")
        .select("id, name")
        .eq("clinic_id", clinicId!)
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!clinicId,
  });

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["stock_batches", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_batches")
        .select("*")
        .eq("clinic_id", clinicId!)
        .order("expiry_date");
      if (error) throw error;
      return data as Batch[];
    },
    enabled: !!clinicId,
  });

  const filtered = filterProduct === "all" ? batches : batches.filter((b) => b.product_id === filterProduct);

  const expiringBatches = batches.filter((b) => {
    const days = differenceInDays(new Date(b.expiry_date), new Date());
    return days >= 0 && days <= 30 && b.quantity > 0;
  });

  const expiredBatches = batches.filter((b) => {
    return differenceInDays(new Date(b.expiry_date), new Date()) < 0 && b.quantity > 0;
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        product_id: productId,
        batch_number: batchNumber,
        expiry_date: expiryDate,
        quantity: parseFloat(quantity) || 0,
        clinic_id: clinicId!,
      };
      if (editing) {
        const { error } = await supabase.from("stock_batches").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("stock_batches").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock_batches"] });
      toast.success(editing ? "Lote atualizado" : "Lote cadastrado");
      resetForm();
    },
    onError: () => toast.error("Erro ao salvar lote"),
  });

  const resetForm = () => {
    setOpen(false);
    setEditing(null);
    setProductId("");
    setBatchNumber("");
    setExpiryDate("");
    setQuantity("");
  };

  const openEdit = (b: Batch) => {
    setEditing(b);
    setProductId(b.product_id);
    setBatchNumber(b.batch_number);
    setExpiryDate(b.expiry_date);
    setQuantity(b.quantity.toString());
    setOpen(true);
  };

  const getProductName = (id: string) => allProducts.find((p) => p.id === id)?.name || "—";

  const getExpiryBadge = (dateStr: string) => {
    const days = differenceInDays(new Date(dateStr), new Date());
    if (days < 0) return <Badge variant="destructive">Vencido</Badge>;
    if (days <= 30) return <Badge variant="destructive" className="bg-warning text-warning-foreground">Vence em {days} dias</Badge>;
    return <Badge variant="secondary">{format(new Date(dateStr + "T12:00:00"), "dd/MM/yyyy")}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Controle de Lotes</h1>
          <p className="text-muted-foreground">Gerencie lotes e validades dos produtos</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Lote</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Lote" : "Novo Lote"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Produto *</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Número do lote *</Label>
                <Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="Ex: LOT-2026-001" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de validade *</Label>
                  <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
                </div>
              </div>
              <Button onClick={() => saveMutation.mutate()} disabled={!productId || !batchNumber || !expiryDate || saveMutation.isPending} className="w-full">
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {expiredBatches.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Lotes vencidos</AlertTitle>
          <AlertDescription>
            {expiredBatches.map((b) => `${getProductName(b.product_id)} (Lote ${b.batch_number})`).join(", ")}
          </AlertDescription>
        </Alert>
      )}

      {expiringBatches.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Próximos do vencimento</AlertTitle>
          <AlertDescription>
            {expiringBatches.map((b) => `${getProductName(b.product_id)} (Lote ${b.batch_number}) — ${format(new Date(b.expiry_date + "T12:00:00"), "dd/MM/yyyy")}`).join(", ")}
          </AlertDescription>
        </Alert>
      )}

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
                <TableHead>Produto</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum lote cadastrado</TableCell></TableRow>
              ) : (
                filtered.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{getProductName(b.product_id)}</TableCell>
                    <TableCell>{b.batch_number}</TableCell>
                    <TableCell>{getExpiryBadge(b.expiry_date)}</TableCell>
                    <TableCell>{b.quantity}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
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
