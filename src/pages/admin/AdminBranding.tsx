import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Palette, Type, Save } from "lucide-react";

export default function AdminBranding() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("*");
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value || ""; });
      return map;
    },
  });

  const [form, setForm] = useState<Record<string, string>>({});

  // Sync form with loaded settings
  const currentValues = {
    login_title: form.login_title ?? settings?.login_title ?? "",
    login_subtitle: form.login_subtitle ?? settings?.login_subtitle ?? "",
    logo_text: form.logo_text ?? settings?.logo_text ?? "",
    primary_color: form.primary_color ?? settings?.primary_color ?? "#4ade80",
  };

  const updateField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const [key, value] of Object.entries(form)) {
        await supabase
          .from("platform_settings")
          .update({ value, updated_at: new Date().toISOString() })
          .eq("key", key);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      queryClient.invalidateQueries({ queryKey: ["platform-settings-public"] });
      setForm({});
      toast({ title: "Configurações salvas!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-[32px] font-bold tracking-tight">Personalização</h1>
        <div className="h-40 rounded-2xl bg-[hsl(0_0%_100%/0.05)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[32px] font-bold tracking-tight">Personalização</h1>
        <p className="text-[15px] text-muted-foreground mt-1">Configure a aparência da tela de login e branding da plataforma</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Settings form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="w-5 h-5 text-primary" />
                Textos da Tela de Login
              </CardTitle>
              <CardDescription>Personalize o título e subtítulo exibidos na página de autenticação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Título Principal</Label>
                <Input
                  value={currentValues.login_title}
                  onChange={(e) => updateField("login_title", e.target.value)}
                  placeholder="Hof Circle Gestão"
                />
              </div>
              <div className="space-y-2">
                <Label>Subtítulo</Label>
                <Input
                  value={currentValues.login_subtitle}
                  onChange={(e) => updateField("login_subtitle", e.target.value)}
                  placeholder="Sistema de gestão para clínicas estéticas"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Logo e Cores
              </CardTitle>
              <CardDescription>Personalize o ícone do logo e a cor accent da plataforma</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Texto do Logo (1-3 caracteres)</Label>
                <Input
                  value={currentValues.logo_text}
                  onChange={(e) => updateField("logo_text", e.target.value.slice(0, 3))}
                  placeholder="HC"
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Cor Principal</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={currentValues.primary_color}
                    onChange={(e) => updateField("primary_color", e.target.value)}
                    className="h-10 w-14 rounded-lg border border-border cursor-pointer bg-transparent"
                  />
                  <Input
                    value={currentValues.primary_color}
                    onChange={(e) => updateField("primary_color", e.target.value)}
                    placeholder="#4ade80"
                    className="flex-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full h-11"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || Object.keys(form).length === 0}
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <p className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">Preview da tela de login</p>
          <div className="rounded-2xl border border-border bg-background p-6 min-h-[500px] flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-[40%] -right-[20%] w-[60%] h-[60%] rounded-full blur-3xl" style={{ background: `${currentValues.primary_color}10` }} />
            </div>
            <div className="w-full max-w-xs relative z-10">
              <div className="text-center mb-6">
                <div
                  className="mx-auto h-12 w-12 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${currentValues.primary_color}, ${currentValues.primary_color}cc)` }}
                >
                  <span className="text-black font-bold text-lg">{currentValues.logo_text || "HC"}</span>
                </div>
                <h2 className="text-[18px] font-bold tracking-tight text-foreground">{currentValues.login_title || "Hof Circle"}</h2>
                <p className="text-[13px] text-muted-foreground mt-0.5">{currentValues.login_subtitle || "Gestão"}</p>
              </div>
              <div className="rounded-xl border border-[hsl(var(--glass-border))] bg-gradient-to-br from-[hsl(0_0%_100%/0.06)] to-transparent p-5 space-y-3">
                <div className="h-4 w-12 bg-[hsl(0_0%_100%/0.1)] rounded" />
                <div className="h-9 bg-[hsl(0_0%_100%/0.04)] rounded-lg border border-border" />
                <div className="h-4 w-10 bg-[hsl(0_0%_100%/0.1)] rounded" />
                <div className="h-9 bg-[hsl(0_0%_100%/0.04)] rounded-lg border border-border" />
                <div
                  className="h-9 rounded-lg flex items-center justify-center"
                  style={{ background: currentValues.primary_color }}
                >
                  <span className="text-black text-[13px] font-semibold">Entrar</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
