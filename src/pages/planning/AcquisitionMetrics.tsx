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
import { Plus, Trash2, PieChart } from "lucide-react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const SOURCES = ["Instagram", "Google", "Indicação", "Anúncios", "Site", "Outros"];

export default function AcquisitionMetrics() {
  const { currentClinic } = useClinic();
  const clinicId = currentClinic?.id;
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [source, setSource] = useState("");
  const [acquisitionDate, setAcquisitionDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["acquisition-sources", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_acquisition_sources")
        .select("*, patients(name)")
        .eq("clinic_id", clinicId!)
        .order("acquisition_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clinicId,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients-list", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, name")
        .eq("clinic_id", clinicId!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!clinicId,
  });

  const addSource = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("patient_acquisition_sources").insert({
        clinic_id: clinicId!,
        patient_id: patientId,
        source,
        acquisition_date: acquisitionDate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acquisition-sources", clinicId] });
      toast.success("Origem registrada!");
      setOpen(false);
      setPatientId("");
      setSource("");
    },
    onError: () => toast.error("Erro ao registrar origem"),
  });

  const deleteSource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("patient_acquisition_sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acquisition-sources", clinicId] });
      toast.success("Registro removido!");
    },
  });

  // Chart data
  const channelCounts: Record<string, number> = {};
  sources.forEach((s) => {
    channelCounts[s.source] = (channelCounts[s.source] || 0) + 1;
  });
  const chartData = Object.entries(channelCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const topChannel = chartData[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Métricas de Captação</h1>
          <p className="text-muted-foreground">Registre e analise a origem dos pacientes</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Registrar Origem</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Origem de Captação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Paciente</Label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Origem</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={acquisitionDate} onChange={(e) => setAcquisitionDate(e.target.value)} />
              </div>
              <Button className="w-full" onClick={() => addSource.mutate()} disabled={!patientId || !source}>
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="num text-[26px] font-semibold tracking-[-0.03em]">{sources.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Canal Mais Efetivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="num text-[26px] font-semibold tracking-[-0.03em]">{topChannel?.name || "—"}</div>
            {topChannel && <p className="text-sm text-muted-foreground">{topChannel.value} pacientes</p>}
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Pacientes por Canal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center">Carregando...</TableCell></TableRow>
              ) : sources.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum registro</TableCell></TableRow>
              ) : (
                sources.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.patients?.name || "—"}</TableCell>
                    <TableCell>{s.source}</TableCell>
                    <TableCell>{format(new Date(s.acquisition_date), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteSource.mutate(s.id)}>
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
