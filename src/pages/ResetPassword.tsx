import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Senha atualizada!", description: "Sua senha foi redefinida com sucesso." });
      navigate("/");
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -right-[20%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-[hsl(142_69%_45%)] flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
            <KeyRound className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">
            {isRecovery ? "Nova Senha" : "Link Inválido"}
          </h1>
          <p className="text-[15px] text-muted-foreground mt-1">
            {isRecovery ? "Digite sua nova senha abaixo" : "Este link é inválido ou já expirou."}
          </p>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--glass-border))] bg-gradient-to-br from-[hsl(0_0%_100%/0.06)] to-[hsl(0_0%_100%/0.02)] backdrop-blur-xl p-8">
          {isRecovery ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "Salvando..." : "Redefinir Senha"}
              </Button>
            </form>
          ) : (
            <Button className="w-full h-11" onClick={() => navigate("/auth")}>
              Voltar ao login
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
