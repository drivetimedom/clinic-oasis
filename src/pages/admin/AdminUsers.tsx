import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/activityLog";
import { Shield, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type SuperAdminUser = {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
};

export default function AdminUsers() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ["super_admin_users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_super_admin_users" as any);
      if (error) throw error;
      return (data || []) as SuperAdminUser[];
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Protection: ensure at least one super admin remains
      if (admins.length <= 1) {
        throw new Error("Não é possível remover o único super admin da plataforma.");
      }
      if (userId === currentUser?.id) {
        throw new Error("Você não pode remover a si mesmo como super admin.");
      }
      const { error } = await supabase.from("super_admins").delete().eq("user_id", userId);
      if (error) throw error;
      const admin = admins.find((a) => a.user_id === userId);
      await logActivity("Super admin removido", `Usuário "${admin?.email}" foi removido como super admin`, "super_admin", userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super_admin_users"] });
      toast({ title: "Super admin removido!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Usuários da Plataforma</h1>
        <p className="text-muted-foreground text-sm">{admins.length} super admin(s) cadastrado(s)</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Desde</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((a) => (
                <TableRow key={a.user_id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-destructive" />
                      {a.full_name || "Sem nome"}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{a.email}</TableCell>
                  <TableCell>
                    <Badge variant="destructive" className="text-xs">Super Admin</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(a.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    {a.user_id === currentUser?.id ? (
                      <Badge variant="outline" className="text-xs">Você</Badge>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={admins.length <= 1}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover Super Admin</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover "{a.email}" como super admin? Esta ação pode ser revertida adicionando novamente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeMutation.mutate(a.user_id)}>
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {admins.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {isLoading ? "Carregando..." : "Nenhum super admin encontrado."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
