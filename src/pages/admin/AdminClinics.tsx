import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, Ban, CheckCircle, Pencil, Search } from "lucide-react";

export default function AdminClinics() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editClinic, setEditClinic] = useState<any>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });

  const { data: clinics = [], isLoading } = useQuery({
    queryKey: ["admin_all_clinics"],
    queryFn: async () => {
      const { data } = await supabase.from("clinics").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clinics").insert({
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_all_clinics"] });
      toast({ title: "Clínica criada com sucesso!" });
      setCreateOpen(false);
      setForm({ name: "", phone: "", email: "", address: "" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (clinic: any) => {
      const { error } = await supabase.from("clinics").update({
        name: clinic.name,
        phone: clinic.phone || null,
        email: clinic.email || null,
        address: clinic.address || null,
      }).eq("id", clinic.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_all_clinics"] });
      toast({ title: "Clínica atualizada!" });
      setEditClinic(null);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "active" ? "blocked" : "active";
      const { error } = await supabase.from("clinics").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_all_clinics"] });
      toast({ title: "Status atualizado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const filtered = clinics.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Clínicas</h1>
          <p className="text-muted-foreground text-sm">{clinics.length} clínicas cadastradas</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Nova Clínica</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Nova Clínica</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Nome da clínica" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contato@clinica.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua, número, bairro..." />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || !form.name}>
                {createMutation.isPending ? "Criando..." : "Criar Clínica"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar clínica..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clínica</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {c.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.phone || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "active" ? "default" : "destructive"} className="text-xs">
                      {c.status === "active" ? "Ativa" : "Bloqueada"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditClinic(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleStatusMutation.mutate({ id: c.id, status: c.status })}
                    >
                      {c.status === "active" ? (
                        <Ban className="h-4 w-4 text-destructive" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {isLoading ? "Carregando..." : "Nenhuma clínica encontrada."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editClinic} onOpenChange={(open) => !open && setEditClinic(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Clínica</DialogTitle></DialogHeader>
          {editClinic && (
            <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(editClinic); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={editClinic.name} onChange={(e) => setEditClinic({ ...editClinic, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={editClinic.phone || ""} onChange={(e) => setEditClinic({ ...editClinic, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={editClinic.email || ""} onChange={(e) => setEditClinic({ ...editClinic, email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input value={editClinic.address || ""} onChange={(e) => setEditClinic({ ...editClinic, address: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
