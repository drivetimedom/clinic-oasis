import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LogIn, UserPlus, Mail } from "lucide-react";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: settings } = useQuery({
    queryKey: ["platform-settings-public"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("key, value");
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value; });
      return map;
    },
  });

  const loginTitle = settings?.login_title || "Hof Circle Gestão";
  const loginSubtitle = settings?.login_subtitle || "Sistema de gestão para clínicas estéticas";
  const logoText = settings?.logo_text || "HC";
  const logoUrl = settings?.logo_url || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: "Email enviado!", description: "Verifique sua caixa de entrada para redefinir a senha." });
        setMode("login");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: "Conta criada!", description: "Verifique seu email para confirmar." });
      }
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    login: { title: "Acesse sua conta", button: "Entrar", icon: LogIn },
    register: { title: "Crie sua conta", button: "Criar conta", icon: UserPlus },
    forgot: { title: "Recuperar senha", button: "Enviar email", icon: Mail },
  };

  const CurrentIcon = titles[mode].icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -right-[20%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-[30%] -left-[20%] w-[50%] h-[50%] rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          {logoUrl ? (
            <div className="mx-auto h-14 w-14 rounded-2xl flex items-center justify-center mb-6 overflow-hidden border border-border bg-[hsl(0_0%_100%/0.05)]">
              <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
            </div>
          ) : (
            <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-[hsl(142_69%_45%)] flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold text-xl">{logoText}</span>
            </div>
          )}
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">{loginTitle}</h1>
          <p className="text-[15px] text-muted-foreground mt-1">{loginSubtitle}</p>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--glass-border))] bg-gradient-to-br from-[hsl(0_0%_100%/0.06)] to-[hsl(0_0%_100%/0.02)] backdrop-blur-xl p-8">
          <div className="mb-6">
            <h2 className="text-[18px] font-semibold text-foreground">{titles[mode].title}</h2>
          </div>

          {mode === "forgot" && (
            <p className="text-[13px] text-muted-foreground mb-6">
              Informe seu email e enviaremos um link para redefinir sua senha.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome completo" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  {mode === "login" && (
                    <button
                      type="button"
                      className="text-[13px] text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => setMode("forgot")}
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} />
              </div>
            )}
            <Button type="submit" className="w-full h-11" disabled={loading}>
              <CurrentIcon className="w-4 h-4" />
              {loading ? "Carregando..." : titles[mode].button}
            </Button>
          </form>

          <div className="mt-6 text-center">
            {mode === "forgot" ? (
              <button
                type="button"
                className="text-[13px] text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setMode("login")}
              >
                Voltar ao login
              </button>
            ) : (
              <button
                type="button"
                className="text-[13px] text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
              >
                {mode === "login" ? "Não tem conta? Criar conta" : "Já tem conta? Entrar"}
              </button>
            )}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/50 text-center mt-6">
          {loginTitle} &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
