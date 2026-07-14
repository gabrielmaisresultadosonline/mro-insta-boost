import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Play, ExternalLink, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type Tutorial = {
  id: string;
  module: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  video_url: string | null;
  button1_label: string | null;
  button1_url: string | null;
  button2_label: string | null;
  button2_url: string | null;
  order_index: number;
  is_active: boolean;
};

type SalesTutorialsProps = {
  variant?: "light" | "dark";
};

export default function SalesTutorials({ variant = "light" }: SalesTutorialsProps) {
  const [items, setItems] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Tutorial | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("sales_tutorials")
        .select("*")
        .eq("is_active", true)
        .order("module", { ascending: true })
        .order("order_index", { ascending: true });
      setItems((data as Tutorial[]) || []);
      setLoading(false);
    })();
  }, []);

  const grouped = items.reduce<Record<string, Tutorial[]>>((acc, t) => {
    (acc[t.module] ||= []).push(t);
    return acc;
  }, {});

  const isDark = variant === "dark";

  return (
    <section
      id="tutoriais"
      className={cn(
        "py-8 md:py-12 h-full overflow-y-auto",
        isDark ? "bg-[#0c1317] text-white" : "bg-gradient-to-b from-white to-green-50"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div
            className={cn(
              "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-4",
              isDark ? "bg-[#00a884]/10 text-[#00a884]" : "bg-green-100 text-green-700"
            )}
          >
            <BookOpen className="w-4 h-4" /> Central de Tutoriais
          </div>
          <h2
            className={cn(
              "text-2xl md:text-4xl font-bold mb-3",
              isDark ? "text-white" : "text-slate-900"
            )}
          >
            Aprenda a usar a plataforma
          </h2>
          <p className={cn("text-base md:text-lg", isDark ? "text-white/60" : "text-slate-600")}>
            Vídeos organizados por módulo — assista quantas vezes precisar.
          </p>
        </div>

        {loading ? (
          <div className={cn("text-center", isDark ? "text-white/40" : "text-slate-400")}>
            Carregando...
          </div>
        ) : items.length === 0 ? (
          <Card
            className={cn(
              "p-10 text-center max-w-xl mx-auto",
              isDark ? "bg-[#111b21] text-white/60 border-white/5" : "text-slate-500"
            )}
          >
            Nenhum tutorial disponível no momento. Volte em breve!
          </Card>
        ) : (
          <div className="space-y-10 max-w-6xl mx-auto">
            {Object.entries(grouped).map(([module, list]) => (
              <div key={module}>
                <h3
                  className={cn(
                    "text-lg md:text-xl font-bold mb-4 flex items-center gap-2",
                    isDark ? "text-white" : "text-slate-900"
                  )}
                >
                  <span className="w-1.5 h-6 bg-green-600 rounded-full" />
                  {module}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {list.map((t) => (
                    <Card
                      key={t.id}
                      onClick={() => setActive(t)}
                      className={cn(
                        "group cursor-pointer overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1",
                        isDark
                          ? "bg-[#111b21] border-white/5 hover:border-[#00a884]/30"
                          : "border-slate-100"
                      )}
                    >
                      <div className="relative aspect-video bg-slate-900">
                        {t.cover_url ? (
                          <img
                            src={t.cover_url}
                            alt={t.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-green-600 to-green-800" />
                        )}
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                            <Play className="w-6 h-6 text-green-600 ml-1" fill="currentColor" />
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <h4
                          className={cn(
                            "font-semibold line-clamp-1",
                            isDark ? "text-white" : "text-slate-900"
                          )}
                        >
                          {t.title}
                        </h4>
                        {t.description && (
                          <p
                            className={cn(
                              "text-sm line-clamp-2 mt-1",
                              isDark ? "text-white/50" : "text-slate-500"
                            )}
                          >
                            {t.description}
                          </p>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent
          className={cn(
            "max-w-3xl p-0 overflow-hidden",
            isDark ? "bg-[#111b21] border-white/5 text-white" : "bg-white"
          )}
        >
          {active && (
            <div>
              <div className="aspect-video bg-black">
                {active.video_url ? (
                  <video src={active.video_url} controls autoPlay className="w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/60">
                    Vídeo não disponível
                  </div>
                )}
              </div>
              <div className="p-5 space-y-3">
                <DialogTitle
                  className={cn(
                    "text-xl font-bold",
                    isDark ? "text-white" : "text-slate-900"
                  )}
                >
                  {active.title}
                </DialogTitle>
                {active.description && (
                  <p className={cn("whitespace-pre-wrap", isDark ? "text-white/70" : "text-slate-600")}>
                    {active.description}
                  </p>
                )}
                {(active.button1_url || active.button2_url) && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {active.button1_url && (
                      <Button
                        asChild
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <a href={active.button1_url} target="_blank" rel="noopener noreferrer">
                          {active.button1_label || "Abrir link"}
                          <ExternalLink className="w-4 h-4 ml-1.5" />
                        </a>
                      </Button>
                    )}
                    {active.button2_url && (
                      <Button
                        asChild
                        variant="outline"
                        className={cn(
                          isDark && "bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <a href={active.button2_url} target="_blank" rel="noopener noreferrer">
                          {active.button2_label || "Abrir link"}
                          <ExternalLink className="w-4 h-4 ml-1.5" />
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
