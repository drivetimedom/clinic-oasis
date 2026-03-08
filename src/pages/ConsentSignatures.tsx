import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { formatDate } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Eye, Printer } from "lucide-react";

export default function ConsentSignatures() {
  const { currentClinic } = useClinic();
  const clinicId = currentClinic!.id;
  const [search, setSearch] = useState("");
  const [viewItem, setViewItem] = useState<any>(null);

  const { data: signed = [], isLoading } = useQuery({
    queryKey: ["consent-signed", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("consent_requests")
        .select("*, patients(name), consent_templates(title, content), procedures(name)")
        .eq("clinic_id", clinicId)
        .eq("status", "signed")
        .order("signed_at", { ascending: false });
      return data || [];
    },
  });

  const filtered = signed.filter((s: any) =>
    (s.patients?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.consent_templates?.title || "").toLowerCase().includes(search.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Assinaturas</h1>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Buscar paciente ou termo..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Paciente</TableHead><TableHead>Termo</TableHead><TableHead>Procedimento</TableHead><TableHead>Assinado em</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            : filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma assinatura encontrada</TableCell></TableRow>
            : filtered.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.patients?.name || s.patient_name || "—"}</TableCell>
                <TableCell>{s.consent_templates?.title || "—"}</TableCell>
                <TableCell>{s.procedures?.name || "—"}</TableCell>
                <TableCell>{s.signed_at ? formatDate(s.signed_at) : "—"}</TableCell>
                <TableCell><Badge className="bg-success/20 text-success">Assinado</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => setViewItem(s)}><Eye className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      {/* View signed document */}
      <Dialog open={!!viewItem} onOpenChange={(v) => { if (!v) setViewItem(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Termo Assinado</span>
              <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" />Imprimir</Button>
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-6 print:space-y-4" id="consent-print">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold">{viewItem.consent_templates?.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{currentClinic?.name}</p>
              </div>
              <div>
                <p className="text-sm"><strong>Paciente:</strong> {viewItem.patients?.name || viewItem.patient_name}</p>
                {viewItem.procedures?.name && <p className="text-sm"><strong>Procedimento:</strong> {viewItem.procedures.name}</p>}
                <p className="text-sm"><strong>Data da assinatura:</strong> {viewItem.signed_at ? new Date(viewItem.signed_at).toLocaleString("pt-BR") : "—"}</p>
              </div>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap border rounded-md p-4 bg-muted/30">
                {viewItem.consent_templates?.content}
              </div>
              {viewItem.signature_data && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Assinatura Digital:</p>
                  <img src={viewItem.signature_data} alt="Assinatura" className="max-h-24 border rounded" />
                  <p className="text-xs text-muted-foreground mt-2">Assinado digitalmente em {viewItem.signed_at ? new Date(viewItem.signed_at).toLocaleString("pt-BR") : "—"}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
