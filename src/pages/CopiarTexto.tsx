import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Copy, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { decodeCopyPayload } from "@/lib/copyLink";

/**
 * Página pública de cópia rápida (/copiar).
 * Recebe o conteúdo codificado em base64url no parâmetro `c` e um rótulo em `t`.
 * Funciona em celular, notebook e desktop, com fallback para navegadores
 * antigos que não suportam a Clipboard API.
 */
const CopiarTexto = () => {
  const [params] = useSearchParams();
  const [copied, setCopied] = useState(false);

  const value = useMemo(() => decodeCopyPayload(params.get("c") || ""), [params]);
  const label = params.get("t") || "Copiar";

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Fallback para navegadores sem permissão/suporte à Clipboard API.
      try {
        const el = document.createElement("textarea");
        el.value = value;
        el.setAttribute("readonly", "");
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    }
  };

  useEffect(() => {
    document.title = "Copiar conteúdo";
    // Tenta copiar automaticamente ao abrir (alguns navegadores exigem o clique).
    copy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <section className="w-full max-w-md bg-card border rounded-2xl shadow-lg p-6 space-y-5">
        <header className="text-center space-y-1">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{label}</h1>
          <p className="text-sm text-muted-foreground">
            Toque no botão abaixo para copiar para a área de transferência.
          </p>
        </header>

        {value ? (
          <div className="rounded-xl bg-muted p-3 break-all font-mono text-xs text-foreground max-h-52 overflow-y-auto">
            {value}
          </div>
        ) : (
          <p className="text-sm text-destructive text-center">Conteúdo inválido ou expirado.</p>
        )}

        <Button onClick={copy} disabled={!value} className="w-full h-12 text-base font-bold">
          {copied ? <Check className="w-5 h-5 mr-2" /> : <Copy className="w-5 h-5 mr-2" />}
          {copied ? "Copiado!" : "Copiar agora"}
        </Button>

        <p className="text-[11px] text-center text-muted-foreground">
          Depois de copiar, volte para a conversa e cole onde precisar.
        </p>
      </section>
    </main>
  );
};

export default CopiarTexto;
