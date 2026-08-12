/**
 * Utilitários para gerar links de "copiar para a área de transferência".
 *
 * O WhatsApp Cloud API não oferece um botão nativo de "copiar código" em
 * mensagens livres (apenas em templates de OTP/cupom). Para permitir que o
 * cliente clique e copie em qualquer aparelho (celular, notebook ou desktop),
 * enviamos um botão de link (cta_url) apontando para a página pública /copiar,
 * que copia o conteúdo automaticamente ao ser aberta/clicada.
 */

/** Domínio público usado nos botões enviados ao WhatsApp (precisa ser HTTPS). */
export const PUBLIC_APP_URL = "https://mro-insta-boost.lovable.app";

/** Codifica em base64 seguro para URL (suporta acentos e emojis). */
export function encodeCopyPayload(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decodifica o payload gerado por `encodeCopyPayload`. */
export function decodeCopyPayload(encoded: string): string {
  try {
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

/** Monta a URL pública da página de cópia. */
export function buildCopyUrl(value: string, label?: string): string {
  const params = new URLSearchParams();
  params.set("c", encodeCopyPayload(value));
  if (label) params.set("t", label.slice(0, 60));
  return `${PUBLIC_APP_URL}/copiar?${params.toString()}`;
}
