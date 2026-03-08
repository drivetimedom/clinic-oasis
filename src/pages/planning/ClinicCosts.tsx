import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, DollarSign, Clock } from "lucide-react";

const COST_CATEGORIES = ["Aluguel", "Salários", "Marketing", "Softwares", "Energia", "Internet", "Outros"];

export default function ClinicCosts() {
  const { currentClinic } = useClinic();
  const clinicId = currentClinic?.id;
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState("");

  const { data: costs = [], isLoading } = useQuery({
    queryKey: ["clinic-costs", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_costs")
        .select("*")
        .eq("clinic_id", clinicId!)
        .order("category");
      if (error) throw error;
      return data;
    },
    enabled: !!clinicId,
  });

  const { data: settings } = useQuery({
    queryKey: ["clinic-settings", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_settings")
        .select("*")
        .eq("clinic_id", clinicId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clinicId,
  });

  const addCost = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clinic_costs").insert({
        clinic_id: clinicId!,
        name,
        category,
        monthly_amount: parseFloat(monthlyAmount),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-costs", clinicId] });
      toast.success("Custo adicionado!");
      setOpen(false);
      setName("");
      setCategory("");
      setMonthlyAmount("");
    },
    onError: () => toast.error("Erro ao adicionar custo"),
  });

  const deleteCost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clinic_costs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-costs", clinicId] });
      toast.success("Custo removido!");
    },
  });

  const updateHours = useMutation({
    mutationFn: async (hours: number) => {
      if (settings) {
        const { error } = await supabase
          .from("clinic_settings")
          .update({ monthly_working_hours: hours })
          .eq("clinic_id", clinicId!);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("clinic_settings")
          .insert({ clinic_id: clinicId!, monthly_working_hours: hours });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-settings", clinicId] });
      toast.success("Horas atualizadas!");
    },
  });

  const totalMonthlyCost = costs.reduce((sum, c) => sum + Number(c.monthly_amount), 0);
  const monthlyHours = settings?.monthly_working_hours || 160;
  const costPerHour = monthlyHours > 0 ? totalMonthlyCost / monthlyHours : 0;

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Custos da Clínica</h1>
          <p className="text-muted-foreground">Gerencie os custos fixos mensais</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Adicionar Custo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Custo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome do custo</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Aluguel" />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {COST_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor mensal (R$)</Label>
                <Input type="number" value={monthlyAmount} onChange={(e) => setMonthlyAmount(e.target.value)} placeholder="0,00" />
              </div>
              <Button className="w-full" onClick={() => addCost.mutate()} disabled={!name || !category || !monthlyAmount}>
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Custo Mensal Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(totalMonthlyCost)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Horas/Mês</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="w-24"
                defaultValue={monthlyHours}
                onBlur={(e) => {
                  const v = parseInt(e.target.value);
                  if (v > 0) updateHours.mutate(v);
                }}
              />
              <span className="text-sm text-muted-foreground">horas</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Custo por Hora</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(costPerHour)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor Mensal</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center">Carregando...</TableCell></TableRow>
              ) : costs.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum custo cadastrado</TableCell></TableRow>
              ) : (
                costs.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell className="font-medium">{cost.name}</TableCell>
                    <TableCell>{cost.category}</TableCell>
                    <TableCell className="text-right">{fmt(Number(cost.monthly_amount))}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteCost.mutate(cost.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
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
