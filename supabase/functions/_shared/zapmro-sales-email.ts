// Envio de email de boas-vindas para novas vendas do CRM (zapmro.com.br)
// Usa SMTP direto (Hostinger) — mesmo padrão de broadcast-email

const SMTP_HOST = "smtp.hostinger.com";
const SMTP_PORT = 465;
const SMTP_USER = "suporte@zapmro.com.br";
const FROM_NAME = "ZapMRO • CRM WhatsApp";

const encoder = new TextEncoder();
const toBase64 = (str: string): string => {
  const bytes = encoder.encode(str);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};
const encodeHeader = (v: string) =>
  /^[\x20-\x7E]*$/.test(v) ? v : `=?UTF-8?B?${toBase64(v)}?=`;

async function sendSmtpEmail(opts: {
  to: string; subject: string; htmlBody: string; textBody: string;
}) {
  const password = Deno.env.get("ZAPMRO_SMTP_PASSWORD");
  if (!password) throw new Error("ZAPMRO_SMTP_PASSWORD não configurado");

  const conn = await Deno.connectTls({ hostname: SMTP_HOST, port: SMTP_PORT });
  const read = async () => {
    const buf = new Uint8Array(4096);
    const n = await conn.read(buf);
    return n ? new TextDecoder().decode(buf.subarray(0, n)) : "";
  };
  const write = async (d: string) => { await conn.write(encoder.encode(d)); };
  const cmd = async (c: string, code?: string) => {
    await write(c + "\r\n");
    const r = await read();
    if (code && !r.startsWith(code)) throw new Error(`SMTP ${code} esperado, veio: ${r.trim()}`);
    return r;
  };

  try {
    await read();
    await cmd("EHLO localhost", "250");
    await cmd("AUTH LOGIN", "334");
    await cmd(btoa(SMTP_USER), "334");
    await cmd(btoa(password), "235");
    await cmd(`MAIL FROM:<${SMTP_USER}>`, "250");
    await cmd(`RCPT TO:<${opts.to}>`, "250");
    await cmd("DATA", "354");

    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const headers = [
      `From: ${encodeHeader(FROM_NAME)} <${SMTP_USER}>`,
      `To: ${opts.to}`,
      `Subject: ${encodeHeader(opts.subject)}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      `Date: ${new Date().toUTCString()}`,
      ``,
    ].join("\r\n");
    const textPart = [`--${boundary}`, `Content-Type: text/plain; charset=UTF-8`, `Content-Transfer-Encoding: base64`, ``, toBase64(opts.textBody)].join("\r\n");
    const htmlPart = [`--${boundary}`, `Content-Type: text/html; charset=UTF-8`, `Content-Transfer-Encoding: base64`, ``, toBase64(opts.htmlBody)].join("\r\n");
    const msg = `${headers}\r\n${textPart}\r\n${htmlPart}\r\n--${boundary}--\r\n.\r\n`;
    await write(msg);
    const r = await read();
    if (!r.startsWith("250")) throw new Error(`SMTP DATA: ${r.trim()}`);
    await cmd("QUIT");
  } finally {
    try { conn.close(); } catch { /* ignore */ }
  }
}

export async function sendCrmSalesApprovedEmail(params: {
  to: string;
  fullName: string;
  planLabel: string;
  amount: number;
  loginUrl?: string;
}) {
  const login = params.loginUrl || "https://zapmro.com.br/crm/login";
  const firstName = (params.fullName || "").split(" ")[0] || "cliente";
  const subject = `✅ Acesso liberado — ${params.planLabel} | ZapMRO CRM`;

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(135deg,#128C7E 0%,#25D366 100%);padding:32px 30px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;">Pagamento aprovado! 🎉</h1>
          <p style="color:#e6fffa;margin:8px 0 0;font-size:14px;">Seu acesso ao ZapMRO CRM está liberado</p>
        </td></tr>
        <tr><td style="padding:30px;">
          <p style="color:#111;font-size:16px;margin:0 0 12px;">Olá <strong>${firstName}</strong>,</p>
          <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 20px;">
            Recebemos seu pagamento e seu acesso já foi liberado. Confira os detalhes abaixo:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #d1fae5;border-radius:12px;padding:16px;margin:0 0 24px;">
            <tr><td style="padding:6px 10px;color:#065f46;font-size:14px;"><strong>Plano:</strong> ${params.planLabel}</td></tr>
            <tr><td style="padding:6px 10px;color:#065f46;font-size:14px;"><strong>Valor:</strong> R$ ${Number(params.amount).toFixed(2)}</td></tr>
            <tr><td style="padding:6px 10px;color:#065f46;font-size:14px;"><strong>Email de acesso:</strong> ${params.to}</td></tr>
          </table>
          <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 20px;">
            Para entrar na plataforma, clique no botão abaixo e faça login com o email e a senha que você cadastrou no momento da compra:
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr><td>
            <a href="${login}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:bold;font-size:15px;">🚀 Entrar no CRM</a>
          </td></tr></table>
          <p style="color:#666;font-size:13px;line-height:1.6;margin:24px 0 0;">
            Precisa de ajuda? Responda este email ou chame nosso suporte que o time responde rapidinho.
          </p>
        </td></tr>
        <tr><td style="background:#0f172a;padding:16px;text-align:center;">
          <p style="color:#94a3b8;margin:0;font-size:12px;">© ${new Date().getFullYear()} ZapMRO • CRM oficial API Meta WhatsApp</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;

  const text =
    `Olá ${firstName},\n\n` +
    `Seu pagamento foi aprovado e o acesso ao ZapMRO CRM está liberado.\n\n` +
    `Plano: ${params.planLabel}\n` +
    `Valor: R$ ${Number(params.amount).toFixed(2)}\n` +
    `Email de acesso: ${params.to}\n\n` +
    `Entre em: ${login}\n\n` +
    `Precisa de ajuda? Responda este email.\n\n— Equipe ZapMRO`;

  await sendSmtpEmail({ to: params.to, subject, htmlBody: html, textBody: text });
}