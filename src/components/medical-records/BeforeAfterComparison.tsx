import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SlidersHorizontal, X, ImageIcon } from "lucide-react";

type Props = { patientId: string };

const PHOTO_TYPES: Record<string, string> = {
  before: "Antes",
  after: "Depois",
  followup: "Acompanhamento",
};

function ComparisonSlider({ beforeUrl, afterUrl }: { beforeUrl: string; afterUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    updatePosition(e.clientX);
  }, [dragging, updatePosition]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[4/3] overflow-hidden rounded-lg cursor-col-resize select-none touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* After image (full width background) */}
      <img src={afterUrl} alt="Depois" className="absolute inset-0 w-full h-full object-cover" />

      {/* Before image (clipped) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        <img src={beforeUrl} alt="Antes" className="absolute inset-0 w-full h-full object-cover" style={{ width: `${containerRef.current?.offsetWidth || 0}px`, maxWidth: "none" }} />
      </div>

      {/* Slider line */}
      <div className="absolute top-0 bottom-0 z-10" style={{ left: `${position}%`, transform: "translateX(-50%)" }}>
        <div className="w-0.5 h-full bg-white shadow-lg" />
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 z-20">
        <Badge className="bg-primary text-primary-foreground">Antes</Badge>
      </div>
      <div className="absolute top-3 right-3 z-20">
        <Badge className="bg-primary text-primary-foreground">Depois</Badge>
      </div>
    </div>
  );
}

export default function BeforeAfterComparison({ patientId }: Props) {
  const { currentClinic } = useClinic();
  const clinicId = currentClinic!.id;
  const [selectedProcedure, setSelectedProcedure] = useState<string>("all");
  const [selectedBefore, setSelectedBefore] = useState<string | null>(null);
  const [selectedAfter, setSelectedAfter] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const { data: photos = [] } = useQuery({
    queryKey: ["clinical-photos", patientId, clinicId],
    queryFn: async () => {
      const { data } = await supabase
        .from("clinical_photos")
        .select("*, procedures(name)")
        .eq("patient_id", patientId)
        .eq("clinic_id", clinicId)
        .order("photo_date", { ascending: false });
      return data || [];
    },
  });

  // Group by procedure
  const procedureGroups = photos.reduce((acc: Record<string, { name: string; photos: any[] }>, p: any) => {
    const key = p.procedure_id || "none";
    const name = p.procedures?.name || "Sem procedimento";
    if (!acc[key]) acc[key] = { name, photos: [] };
    acc[key].photos.push(p);
    return acc;
  }, {});

  const filteredPhotos = selectedProcedure === "all" ? photos : photos.filter((p: any) => (p.procedure_id || "none") === selectedProcedure);
  const beforePhotos = filteredPhotos.filter((p: any) => p.photo_type === "before");
  const afterPhotos = filteredPhotos.filter((p: any) => p.photo_type === "after");

  const beforePhoto = photos.find((p: any) => p.id === selectedBefore);
  const afterPhoto = photos.find((p: any) => p.id === selectedAfter);

  const canCompare = selectedBefore && selectedAfter;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            Antes e Depois
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {photos.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhuma foto registrada. Adicione fotos na seção "Fotos Clínicas".</p>
          ) : (
            <>
              {/* Filter by procedure */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                <div className="space-y-1 flex-1 max-w-xs">
                  <label className="text-sm font-medium">Filtrar por procedimento</label>
                  <Select value={selectedProcedure} onValueChange={v => { setSelectedProcedure(v); setSelectedBefore(null); setSelectedAfter(null); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Object.entries(procedureGroups).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button disabled={!canCompare} onClick={() => setShowComparison(true)} className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" />Comparar
                </Button>
              </div>

              {/* Photo selection grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Before column */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Badge variant="outline">Antes</Badge>
                    <span className="text-muted-foreground text-xs">Selecione uma foto</span>
                  </h3>
                  {beforePhotos.length === 0 ? (
                    <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Nenhuma foto "Antes" encontrada
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {beforePhotos.map((p: any) => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedBefore(selectedBefore === p.id ? null : p.id)}
                          className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${selectedBefore === p.id ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"}`}
                        >
                          <img src={p.photo_url} alt="Antes" className="w-full aspect-square object-cover" />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                            <p className="text-[10px] text-white">{formatDate(p.photo_date)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* After column */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Badge variant="outline">Depois</Badge>
                    <span className="text-muted-foreground text-xs">Selecione uma foto</span>
                  </h3>
                  {afterPhotos.length === 0 ? (
                    <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Nenhuma foto "Depois" encontrada
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {afterPhotos.map((p: any) => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedAfter(selectedAfter === p.id ? null : p.id)}
                          className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${selectedAfter === p.id ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"}`}
                        >
                          <img src={p.photo_url} alt="Depois" className="w-full aspect-square object-cover" />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                            <p className="text-[10px] text-white">{formatDate(p.photo_date)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Procedure groups summary */}
              {Object.keys(procedureGroups).length > 0 && selectedProcedure === "all" && (
                <div className="space-y-3 pt-4 border-t border-border">
                  <h3 className="font-semibold text-sm">Fotos por Procedimento</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(procedureGroups).map(([k, v]) => {
                      const before = v.photos.filter((p: any) => p.photo_type === "before").length;
                      const after = v.photos.filter((p: any) => p.photo_type === "after").length;
                      return (
                        <div key={k} className="p-3 rounded-lg bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors" onClick={() => setSelectedProcedure(k)}>
                          <p className="font-medium text-sm">{v.name}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px]">{before} antes</Badge>
                            <Badge variant="outline" className="text-[10px]">{after} depois</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Comparison dialog */}
      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <button onClick={() => setShowComparison(false)} className="absolute top-2 right-2 z-30 bg-black/50 rounded-full p-1">
            <X className="h-5 w-5 text-white" />
          </button>
          {beforePhoto && afterPhoto && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Comparação Antes e Depois</h3>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>Antes: {formatDate(beforePhoto.photo_date)}</span>
                  <span>•</span>
                  <span>Depois: {formatDate(afterPhoto.photo_date)}</span>
                </div>
              </div>
              <ComparisonSlider beforeUrl={beforePhoto.photo_url} afterUrl={afterPhoto.photo_url} />
              <p className="text-xs text-muted-foreground text-center">Arraste o controle deslizante para comparar as imagens</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
