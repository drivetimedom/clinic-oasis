import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { CheckCircle, Loader2 } from "lucide-react";

interface ConsentData {
  id: string;
  status: string;
  patient_name: string;
  clinic_name: string;
  clinic_logo: string | null;
  template_title: string;
  template_content: string;
  procedure_name: string | null;
  sent_at: string;
}

export default function ConsentSign() {
  const { token } = useParams<{ token: string }>();
  const [consent, setConsent] = useState<ConsentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    loadConsent();
  }, [token]);

  const loadConsent = async () => {
    try {
      const { data, error: rpcError } = await supabase.rpc("get_consent_by_token", { _token: token });
      if (rpcError) throw rpcError;
      if (!data) { setError("Termo não encontrado."); return; }
      const consentData = data as unknown as ConsentData;
      if (consentData.status === "signed") { setSigned(true); }
      setConsent(consentData);
    } catch (e: any) {
      setError("Erro ao carregar o termo.");
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!signatureData || !consent) return;
    setSigning(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("sign_consent", {
        _token: token!,
        _patient_name: consent.patient_name,
        _signature_data: signatureData,
      });
      if (rpcError) throw rpcError;
      setSigned(true);
    } catch (e: any) {
      setError("Erro ao registrar assinatura.");
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <p className="text-destructive text-lg">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-success mx-auto" />
            <h2 className="text-2xl font-bold">Termo Assinado!</h2>
            <p className="text-muted-foreground">Sua assinatura foi registrada com sucesso. Você pode fechar esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!consent) return null;

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            {consent.clinic_logo && <img src={consent.clinic_logo} alt="" className="h-12 mx-auto mb-2" />}
            <CardTitle className="text-xl">{consent.clinic_name}</CardTitle>
            <p className="text-muted-foreground text-sm">Termo de Consentimento</p>
          </CardHeader>
        </Card>

        {/* Patient info */}
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-sm"><strong>Paciente:</strong> {consent.patient_name}</p>
            {consent.procedure_name && <p className="text-sm"><strong>Procedimento:</strong> {consent.procedure_name}</p>}
            <p className="text-sm"><strong>Data:</strong> {new Date().toLocaleDateString("pt-BR")}</p>
          </CardContent>
        </Card>

        {/* Consent content */}
        <Card>
          <CardHeader><CardTitle className="text-lg">{consent.template_title}</CardTitle></CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">
              {consent.template_content}
            </div>
          </CardContent>
        </Card>

        {/* Signature */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Assinatura</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Ao assinar abaixo, declaro que li e compreendi o termo acima e autorizo a realização do procedimento.</p>
            <SignatureCanvas onSignatureChange={setSignatureData} />
            <Button className="w-full" size="lg" disabled={!signatureData || signing} onClick={handleSign}>
              {signing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Registrando...</> : "Confirmar Assinatura"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
