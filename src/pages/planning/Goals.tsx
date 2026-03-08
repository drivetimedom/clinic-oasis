import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, Trash2, Target } from "lucide-react";
import { format } from "date-fns";

const GOAL_TYPES = [
  { value: "monthly_revenue", label: "Faturamento Mensal" },
  { value: "quarterly_revenue", label: "Faturamento Trimestral" },
  { value: "new_patients", label: "Novos Pacientes" },
  { value: "appointments", label: "Atendimentos" },
];

export default function Goals() {
  const { currentClinic } = useClinic();
  const clinicId = currentClinic?.id;
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [goalType, setGoalType] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["clinic-goals", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_goals")
        .select("*")
        .eq("clinic_id", clinicId!)
        .order("period_start", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clinicId,
  });

  const addGoal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clinic_goals").insert({
        clinic_id: clinicId!,
        goal_type: goalType,
        target_value: parseFloat(targetValue),
        period_start: periodStart,
        period_end: periodEnd,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-goals", clinicId] });
      toast.success("Meta adicionada!");
      setOpen(false);
      setGoalType("");
      setTargetValue("");
      setPeriodStart("");
      setPeriodEnd("");
    },
    onError: () => toast.error("Erro ao adicionar meta"),
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clinic_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-goals", clinicId] });
      toast.success("Meta removida!");
    },
  });

  const getGoalLabel = (type: string) =>
    GOAL_TYPES.find((g) => g.value === type)?.label || type;

  const isRevenue = (type: string) => type.includes("revenue");

  const fmt = (v: number, revenue: boolean) =>
    revenue
      ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : v.toLocaleString("pt-BR");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Metas</h1>
          <p className="text-muted-foreground">Defina e acompanhe as metas da clínica</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Meta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Meta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tipo de meta</Label>
                <Select value={goalType} onValueChange={setGoalType}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {GOAL_TYPES.map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor alvo</Label>
                <Input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="0" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Início</Label>
                  <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                </div>
                <div>
                  <Label>Fim</Label>
                  <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => addGoal.mutate()}
                disabled={!goalType || !targetValue || !periodStart || !periodEnd}
              >
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma meta cadastrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const rev = isRevenue(goal.goal_type);
            return (
              <Card key={goal.id}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <CardTitle className="text-sm font-medium">{getGoalLabel(goal.goal_type)}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(goal.period_start), "dd/MM/yyyy")} — {format(new Date(goal.period_end), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteGoal.mutate(goal.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    {fmt(Number(goal.target_value), rev)}
                  </div>
                  <Progress value={0} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">Progresso calculado no dashboard</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
