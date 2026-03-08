import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Palette, Type, Save, Upload, X, Image } from "lucide-react";

export default function AdminBranding() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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

  const currentValues = {
    login_title: form.login_title ?? settings?.login_title ?? "",
    login_subtitle: form.login_subtitle ?? settings?.login_subtitle ?? "",
    logo_text: form.logo_text ?? settings?.logo_text ?? "",
    primary_color: form.primary_color ?? settings?.primary_color ?? "#4ade80",
    logo_url: form.logo_url ?? settings?.logo_url ?? "",
  };

  const updateField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Erro", description: "Selecione um arquivo de imagem.", variant: "destructive" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Erro", description: "A imagem deve ter no máximo 2MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("platform-assets")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("platform-assets")
        .getPublicUrl(fileName);

      updateField("logo_url", urlData.publicUrl);
      toast({ title: "Logo carregado com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao fazer upload", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeLogo = () => {
    updateField("logo_url", "");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const [key, value] of Object.entries(form)) {
        // Upsert: try update first, if no rows affected, insert
        const { data } = await supabase
          .from("platform_settings")
          .update({ value, updated_at: new Date().toISOString() })
          .eq("key", key)
          .select();

        if (!data || data.length === 0) {
          await supabase
            .from("platform_settings")
            .insert({ key, value });
        }
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

  const hasLogo = !!currentValues.logo_url;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[32px] font-bold tracking-tight">Personalização</h1>
        <p className="text-[15px] text-muted-foreground mt-1">Configure a aparência da tela de login e branding da plataforma</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                <Image className="w-5 h-5 text-primary" />
                Logo da Plataforma
              </CardTitle>
              <CardDescription>Faça upload de uma imagem ou use texto como logo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Logo upload */}
              <div className="space-y-3">
                <Label>Imagem do Logo</Label>
                {hasLogo ? (
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl border border-border bg-[hsl(0_0%_100%/0.05)] flex items-center justify-center overflow-hidden">
                      <img
                        src={currentValues.logo_url}
                        alt="Logo"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Upload className="w-4 h-4" />
                        Trocar imagem
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={removeLogo}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                        Remover logo
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full h-28 rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-[hsl(0_0%_100%/0.02)] hover:bg-[hsl(0_0%_100%/0.04)] transition-all duration-200 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <Upload className="w-6 h-6" />
                    <span className="text-[13px] font-medium">
                      {uploading ? "Enviando..." : "Clique para enviar uma imagem"}
                    </span>
                    <span className="text-[11px] text-muted-foreground/60">PNG, JPG ou SVG até 2MB</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>

              {/* Fallback text */}
              <div className="space-y-2">
                <Label>Texto do Logo (fallback, 1-3 caracteres)</Label>
                <Input
                  value={currentValues.logo_text}
                  onChange={(e) => updateField("logo_text", e.target.value.slice(0, 3))}
                  placeholder="HC"
                  maxLength={3}
                />
                <p className="text-[11px] text-muted-foreground/60">Usado quando não há imagem de logo</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Cor Principal
              </CardTitle>
              <CardDescription>Personalize a cor accent da plataforma</CardDescription>
            </CardHeader>
            <CardContent>
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
                {hasLogo ? (
                  <div className="mx-auto h-14 w-14 rounded-2xl flex items-center justify-center mb-4 overflow-hidden border border-border bg-[hsl(0_0%_100%/0.05)]">
                    <img src={currentValues.logo_url} alt="Logo" className="h-full w-full object-contain" />
                  </div>
                ) : (
                  <div
                    className="mx-auto h-12 w-12 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${currentValues.primary_color}, ${currentValues.primary_color}cc)` }}
                  >
                    <span className="text-black font-bold text-lg">{currentValues.logo_text || "HC"}</span>
                  </div>
                )}
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
