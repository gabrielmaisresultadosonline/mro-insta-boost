import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AnnouncementsAdminPanel from "@/components/admin/AnnouncementsAdminPanel";
import SalesOrdersPanel from "@/components/admin/SalesOrdersPanel";
import TutorialsAdminPanel from "@/components/admin/TutorialsAdminPanel";
import TrialsPanel from "@/components/admin/TrialsPanel";
import { toast } from "sonner";
import {
  Loader2,
  Trash2,
  KeyRound,
  Mail,
  Power,
  RefreshCw,
  BarChart3,
  Search,
  CheckCircle2,
  XCircle,
  Users,
  MessageCircle,
  TrendingUp,
  Zap,
  ExternalLink,
  Database,
  Download,
  FileText,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Shield,
} from "lucide-react";

type AdminUser = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  full_name: string | null;
  whatsapp_profile_number: string | null;
  role: string;
  meta_display_phone_number: string | null;
  meta_verified_name: string | null;
  meta_phone_number_id: string | null;
  connected: boolean;
};

type Insights = {
  totalReceived: number;
  totalSent: number;
  totalContacts: number;
  paidConversations: number;
};

type DumpProgress = {
  phase: string;
  current: number;
  total: number;
  detail: string;
};

const STORAGE_KEY = "admincentral_creds_v1";

function ReportStat({
  icon,
  label,
  value,
  hint,
  gradient,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
  gradient: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${
        onClick ? "cursor-pointer" : ""
      } ${active ? "border-[#25D366] ring-2 ring-[#25D366]/30" : "border-[#E8F5F1]"}`}
    >
      <div className={`absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-white shadow-sm mb-2`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-[#075E54] tabular-nums">{value.toLocaleString("pt-BR")}</div>
      <div className="text-xs text-[#128C7E]/80 font-medium">{label}</div>
      {hint && <div className="text-[10px] text-[#25D366] mt-0.5 font-semibold">{hint}</div>}
      {onClick && (
        <div className="text-[10px] text-[#128C7E] mt-1 font-semibold">
          {active ? "Ocultar lista ▲" : "Ver lista ▼"}
        </div>
      )}
    </div>
  );
}

/**
 * MigrationPanel — exporta dump SQL do banco conectado
 */
function MigrationPanel({ creds }: { creds: { email: string; password: string } }) {
  const [dumping, setDumping] = useState(false);
  const [progress, setProgress] = useState<DumpProgress | null>(null);
  const [dumpResult, setDumpResult] = useState<{
    sql: string;
    readme?: string;
    tablesCount: number;
    rowsCount: number;
    usersCount?: number;
    filesCount?: number;
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  async function startDump() {
    setDumping(true);
    setDumpResult(null);
    setProgress({ phase: "Conectando...", current: 0, total: 0, detail: "" });

    try {
      // Busca todas as tabelas do banco via RPC
      setProgress({ phase: "Mapeando tabelas...", current: 1, total: 6, detail: "Listando esquemas" });

      // Usa a edge function de admin para fazer o dump
      const { data, error } = await supabase.functions.invoke("crm-central-admin", {
        body: {
          action: "export_dump_sql",
          adminEmail: creds.email,
          adminPassword: creds.password,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao gerar dump");

      setProgress({ phase: "Finalizando...", current: 6, total: 6, detail: "Preparando download" });
      setDumpResult({
        sql: data.sql,
        readme: data.readme,
        tablesCount: data.tablesCount,
        rowsCount: data.rowsCount,
        usersCount: data.usersCount,
        filesCount: data.filesCount,
      });
      toast.success("Dump completo gerado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Falha ao exportar dump");
    } finally {
      setDumping(false);
      setProgress(null);
    }
  }

  function triggerDownload(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadDump() {
    if (!dumpResult) return;
    const date = new Date().toISOString().slice(0, 10);
    triggerDownload(dumpResult.sql, `mro_backup_${date}.sql`, "text/sql;charset=utf-8");
    toast.success("Download iniciado!");
  }

  function downloadReadme() {
    if (!dumpResult?.readme) return;
    const date = new Date().toISOString().slice(0, 10);
    triggerDownload(dumpResult.readme, `MIGRACAO_INSTRUCOES_${date}.md`, "text/markdown;charset=utf-8");
    toast.success("Documentação baixada!");
  }

  function copyToClipboard() {
    if (!dumpResult) return;
    navigator.clipboard.writeText(dumpResult.sql);
    toast.success("SQL copiado para a área de transferência");
  }

  return (
    <div className="space-y-6">
      {/* Card de instrução */}
      <Card className="p-5 bg-gradient-to-br from-[#075E54] to-[#128C7E] border-0 text-white shadow-xl">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Database className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold mb-1">Exportar Dump SQL Completo</h3>
            <p className="text-sm text-white/80 leading-relaxed">
              Exporta <strong>tudo</strong>: extensions, types/enums, sequences, tabelas, dados, views,
              funções, triggers, políticas RLS, índices, FKs, grants, cron jobs, usuários do Auth
              (com hash de senha) e identidades sociais, além dos buckets e do inventário completo dos
              arquivos do Storage. Junto vem a documentação passo a passo para importar no novo banco.
              Apenas os binários do Storage e os secrets precisam ser copiados fora do SQL.
            </p>
          </div>
        </div>
      </Card>


      {/* Info boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-white border-[#E8F5F1]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#075E54]">Auth exportado (INSERT)</p>
              <p className="text-xs text-[#128C7E]/70">auth.users + identidades — testar em banco descartável antes de restaurar</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-white border-[#E8F5F1]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#075E54]">SQL puro (INSERT)</p>
              <p className="text-xs text-[#128C7E]/70">Compatível com psql — não usa COPY/pg_restore</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-white border-[#E8F5F1]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#075E54]">Funciona offline</p>
              <p className="text-xs text-[#128C7E]/70">Arquivo .sql pode ser guardado localmente</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Progress ou Resultado */}
      {dumping && progress && (
        <Card className="p-6 bg-white border-[#E8F5F1]">
          <div className="flex items-center gap-4 mb-4">
            <Loader2 className="h-6 w-6 animate-spin text-[#25D366]" />
            <div>
              <p className="font-semibold text-[#075E54]">{progress.phase}</p>
              <p className="text-xs text-[#128C7E]/70">{progress.detail}</p>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-[#E8F5F1] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#25D366] to-[#128C7E] transition-all duration-500"
              style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
            />
          </div>
        </Card>
      )}

      {dumpResult && !dumping && (
        <>
          {/* Stats do dump */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-[#F0FDF4] border-[#E8F5F1] text-center">
              <p className="text-2xl font-bold text-[#075E54]">{dumpResult.tablesCount}</p>
              <p className="text-xs text-[#128C7E]/70">Tabelas exportadas</p>
            </Card>
            <Card className="p-4 bg-[#F0FDF4] border-[#E8F5F1] text-center">
              <p className="text-2xl font-bold text-[#075E54]">{dumpResult.rowsCount.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-[#128C7E]/70">Linhas exportadas</p>
            </Card>
            <Card className="p-4 bg-[#F0FDF4] border-[#E8F5F1] text-center">
              <p className="text-2xl font-bold text-[#075E54]">{(dumpResult.sql.length / 1024 / 1024).toFixed(1)} MB</p>
              <p className="text-xs text-[#128C7E]/70">Tamanho do arquivo</p>
            </Card>
            <Card className="p-4 bg-[#F0FDF4] border-[#E8F5F1] text-center">
              <p className="text-2xl font-bold text-green-600">✓</p>
              <p className="text-xs text-[#128C7E]/70">Dump pronto</p>
            </Card>
          </div>

          {/* Preview */}
          <Card className="bg-white border-[#E8F5F1] overflow-hidden">
            <div
              className="flex items-center justify-between p-3 border-b border-[#E8F5F1] bg-slate-50 cursor-pointer"
              onClick={() => setPreviewOpen((v) => !v)}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#128C7E]" />
                <span className="text-sm font-medium text-[#075E54]">Prévia do SQL (primeiras 50 linhas)</span>
              </div>
              {previewOpen ? (
                <ChevronUp className="h-4 w-4 text-[#128C7E]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#128C7E]" />
              )}
            </div>
            {previewOpen && (
              <pre className="p-4 text-xs text-slate-600 font-mono overflow-x-auto max-h-64 bg-slate-900 text-green-400 leading-relaxed">
                {dumpResult.sql.split("\n").slice(0, 50).join("\n")}
                {dumpResult.sql.split("\n").length > 50 && "\n\n-- ... (continua no arquivo baixado)"}
              </pre>
            )}
          </Card>

          {/* Ações */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={downloadDump}
              className="bg-[#25D366] hover:bg-[#128C7E] text-white gap-2"
            >
              <Download className="h-4 w-4" /> Baixar .sql
            </Button>
            {dumpResult.readme && (
              <Button
                onClick={downloadReadme}
                className="bg-[#075E54] hover:bg-[#128C7E] text-white gap-2"
              >
                <FileText className="h-4 w-4" /> Baixar documentação
              </Button>
            )}
            <Button
              variant="outline"
              onClick={copyToClipboard}
              className="bg-white border-[#E8F5F1] text-[#075E54] hover:bg-[#F0FDF4] gap-2"
            >
              <Copy className="h-4 w-4" /> Copiar SQL
            </Button>
            <Button
              variant="outline"
              onClick={() => { setDumpResult(null); }}
              className="bg-white border-[#E8F5F1] text-[#075E54] hover:bg-[#F0FDF4] gap-2"
            >
              <RefreshCw className="h-4 w-4" /> Novo dump
            </Button>
          </div>

          {/* Alerta de segurança */}
          <Card className="p-4 bg-amber-50 border-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Arquivo contém dados sensíveis</p>
                <p className="text-xs text-amber-700">
                  O dump inclui e-mails, senhas hasheadas (não legíveis), mensagens e dados de contatos. Armazene o arquivo em local seguro e não compartilhe publicamente. Para restaurar em outro projeto Supabase, use o Dashboard &gt; SQL Editor &gt; Open file &gt; Run.
                </p>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Botão principal */}
      {!dumpResult && !dumping && (
        <Button
          onClick={startDump}
          className="bg-[#25D366] hover:bg-[#128C7E] text-white text-base px-8 py-6 rounded-xl gap-3 shadow-lg"
        >
          <Database className="h-5 w-5" />
          <span>Exportar Dump SQL Completo</span>
        </Button>
      )}
    </div>
  );
}

export default function AdminCentral() {
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [usersListOpen, setUsersListOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
  const [pwdTarget, setPwdTarget] = useState<AdminUser | null>(null);
  const [newPwd, setNewPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setCreds(JSON.parse(raw));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (creds) loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creds]);

  async function call(action: string, extra: Record<string, any> = {}) {
    if (!creds) throw new Error("no creds");
    const { data, error } = await supabase.functions.invoke("crm-central-admin", {
      body: { action, adminEmail: creds.email, adminPassword: creds.password, ...extra },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "Erro");
    return data;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const { data, error } = await supabase.functions.invoke("crm-central-admin", {
        body: { action: "login", adminEmail: loginEmail, adminPassword: loginPwd },
      });
      if (error || !data?.success) throw new Error(data?.error || "Credenciais inválidas");
      const c = { email: loginEmail, password: loginPwd };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(c));
      setCreds(c);
      toast.success("Bem-vindo ao Admin Central");
    } catch (err: any) {
      toast.error(err.message || "Falha no login");
    } finally {
      setLoggingIn(false);
    }
  }

  function logout() {
    sessionStorage.removeItem(STORAGE_KEY);
    setCreds(null);
    setUsers([]);
    setSelected(null);
  }

  async function loadUsers(attempt = 0) {
    setLoading(true);
    try {
      const data = await call("list_users");
      setUsers(data.users || []);
    } catch (err: any) {
      const message = String(err?.message || "");
      if (message.includes("Credenciais")) {
        toast.error(message);
        logout();
        return;
      }
      if (attempt < 3) {
        const delay = 1500 * (attempt + 1);
        setTimeout(() => loadUsers(attempt + 1), delay);
        return;
      }
      toast.error(message || "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }

  async function openInsights(u: AdminUser) {
    setSelected(u);
    setInsights(null);
    setLoadingInsights(true);
    try {
      const data = await call("user_insights", { userId: u.id });
      setInsights(data.insights);
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar insights");
    } finally {
      setLoadingInsights(false);
    }
  }

  async function handleDelete(u: AdminUser) {
    if (!confirm(`Excluir definitivamente ${u.email}? Esta ação remove o cadastro, contatos e mensagens.`)) return;
    try {
      await call("delete_user", { userId: u.id });
      toast.success("Usuário excluído");
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      if (selected?.id === u.id) setSelected(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir");
    }
  }

  async function handleDisconnect(u: AdminUser) {
    if (!confirm(`Desconectar WhatsApp de ${u.email}?`)) return;
    try {
      await call("disconnect_whatsapp", { userId: u.id });
      toast.success("WhatsApp desconectado");
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro");
    }
  }

  async function handleImpersonate(u: AdminUser) {
    const tab = window.open("", "_blank");
    try {
      const data = await call("impersonate", { userId: u.id });
      if (!data?.url) throw new Error("Não foi possível gerar o acesso");
      if (tab) tab.location.href = data.url;
      else window.open(data.url, "_blank", "noopener,noreferrer");
      toast.success(`Abrindo WhatsApp de ${u.email}`);
    } catch (err: any) {
      tab?.close();
      toast.error(err.message || "Erro ao acessar WhatsApp do usuário");
    }
  }

  async function handleSendReset(u: AdminUser) {
    if (!confirm(`Enviar lembrete de acesso para ${u.email}?\n\nSerá gerada uma nova senha temporária e enviada por e-mail junto com o link de acesso.`)) return;
    try {
      await call("send_access_reminder", { userId: u.id, email: u.email });
      toast.success("Lembrete de acesso enviado por e-mail");
    } catch (err: any) {
      toast.error(err.message || "Erro");
    }
  }

  function openPwdDialog(u: AdminUser) {
    setPwdTarget(u);
    setNewPwd(generatePwd());
    setPwdDialogOpen(true);
  }

  function generatePwd() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let out = "";
    for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out + "@1";
  }

  async function savePassword() {
    if (!pwdTarget) return;
    if (newPwd.length < 6) {
      toast.error("Senha deve ter no mínimo 6 caracteres");
      return;
    }
    setSavingPwd(true);
    try {
      await call("set_password", { userId: pwdTarget.id, newPassword: newPwd });
      toast.success("Senha redefinida — copie e envie ao usuário");
    } catch (err: any) {
      toast.error(err.message || "Erro");
    } finally {
      setSavingPwd(false);
    }
  }

  // ============ LOGIN ============
  if (!creds) {
    return (
      <div className="min-h-screen bg-[#F0FDF4] text-[#075E54] flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 space-y-4 bg-white border-[#E8F5F1] text-[#075E54] shadow-lg shadow-green-900/5">
          <div>
            <h1 className="text-2xl font-bold text-[#075E54]">Admin Central</h1>
            <p className="text-sm text-[#128C7E]/70">Acesso restrito ao administrador principal</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[#075E54]">E-mail</Label>
              <Input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                autoComplete="username"
                required
                className="bg-[#F0FDF4] border-[#E8F5F1] focus-visible:ring-[#25D366]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#075E54]">Senha</Label>
              <Input
                type="password"
                value={loginPwd}
                onChange={(e) => setLoginPwd(e.target.value)}
                autoComplete="current-password"
                required
                className="bg-[#F0FDF4] border-[#E8F5F1] focus-visible:ring-[#25D366]"
              />
            </div>
            <Button type="submit" disabled={loggingIn} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white">
              {loggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // ============ DASHBOARD ============
  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.email?.toLowerCase().includes(q) ||
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.meta_display_phone_number || "").toLowerCase().includes(q) ||
      (u.whatsapp_profile_number || "").toLowerCase().includes(q)
    );
  });

  const connectedCount = users.filter((u) => u.connected).length;
  const disconnectedCount = users.length - connectedCount;
  const connectionRate = users.length > 0 ? Math.round((connectedCount / users.length) * 100) : 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const last7 = new Date(today); last7.setDate(last7.getDate() - 7);
  const newThisWeek = users.filter((u) => new Date(u.created_at) >= last7).length;

  return (
    <div className="min-h-screen bg-[#F0FDF4] text-[#075E54] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#075E54]">Admin Central</h1>
            <p className="text-sm text-[#128C7E]/70">
              {users.length} cadastros · {connectedCount} conectados
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => loadUsers()} disabled={loading} className="bg-white border-[#E8F5F1] text-[#075E54] hover:bg-[#F0FDF4]">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Recarregar
            </Button>
            <Button variant="outline" size="sm" onClick={logout} className="bg-white border-[#E8F5F1] text-[#075E54] hover:bg-[#F0FDF4]">
              Sair
            </Button>
          </div>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-white border border-[#E8F5F1] shadow-sm flex flex-wrap h-auto gap-1">
            <TabsTrigger value="users" className="data-[state=active]:bg-[#25D366] data-[state=active]:text-white">Cadastros & Números</TabsTrigger>
            <TabsTrigger value="trials" className="data-[state=active]:bg-[#25D366] data-[state=active]:text-white">Testes & Acessos</TabsTrigger>
            <TabsTrigger value="sales" className="data-[state=active]:bg-[#25D366] data-[state=active]:text-white">Vendas</TabsTrigger>
            <TabsTrigger value="announcements" className="data-[state=active]:bg-[#25D366] data-[state=active]:text-white">Avisos (Popup)</TabsTrigger>
            <TabsTrigger value="tutorials" className="data-[state=active]:bg-[#25D366] data-[state=active]:text-white">Tutoriais</TabsTrigger>
            <TabsTrigger value="migration" className="data-[state=active]:bg-[#25D366] data-[state=active]:text-white gap-1.5">
              <Database className="h-3.5 w-3.5" /> Migração
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4 mt-4">
        {!loading && users.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#075E54] via-[#128C7E] to-[#25D366] p-1 shadow-xl">
            <div className="rounded-[14px] bg-white p-5 md:p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center shadow-md">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#075E54]">Relatório Geral</h2>
                    <p className="text-xs text-[#128C7E]/70">Visão consolidada da plataforma</p>
                  </div>
                </div>
                <Badge className="bg-[#25D366] hover:bg-[#25D366] text-white border-0 gap-1">
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  Ao vivo
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ReportStat
                  icon={<Users className="h-5 w-5" />}
                  label="Total de cadastros"
                  value={users.length}
                  gradient="from-[#075E54] to-[#128C7E]"
                  onClick={() => {
                    setUsersListOpen((v) => !v);
                    setShowAll(false);
                  }}
                  active={usersListOpen}
                />
                <ReportStat
                  icon={<MessageCircle className="h-5 w-5" />}
                  label="Conectados ao WhatsApp"
                  value={connectedCount}
                  hint={`${connectionRate}% do total`}
                  gradient="from-[#25D366] to-[#128C7E]"
                />
                <ReportStat
                  icon={<XCircle className="h-5 w-5" />}
                  label="Não conectados"
                  value={disconnectedCount}
                  gradient="from-slate-500 to-slate-700"
                />
                <ReportStat
                  icon={<Zap className="h-5 w-5" />}
                  label="Novos (7 dias)"
                  value={newThisWeek}
                  gradient="from-[#34B7F1] to-[#128C7E]"
                />
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-xs text-[#075E54] mb-1.5 font-medium">
                  <span>Taxa de conexão</span>
                  <span>{connectionRate}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-[#E8F5F1] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#25D366] via-[#128C7E] to-[#075E54] transition-all duration-700 shadow-[0_0_12px_rgba(37,211,102,0.6)]"
                    style={{ width: `${connectionRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {usersListOpen && (
        <Card className="p-3 bg-white border-[#E8F5F1] shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#128C7E]/60" />
            <Input
              className="pl-9 bg-[#F0FDF4] border-[#E8F5F1] text-[#075E54] placeholder:text-[#128C7E]/50 focus-visible:ring-[#25D366]"
              placeholder="Buscar por e-mail, nome ou número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Card>
        )}

        {usersListOpen && (loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#128C7E]/60" />
          </div>
        ) : (
          <div className="grid gap-3">
            {(showAll ? filtered : filtered.slice(0, 10)).map((u) => (
              <Card key={u.id} className="p-4 bg-white border-[#E8F5F1] text-[#075E54] shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{u.full_name || u.email}</span>
                      {u.connected ? (
                        <Badge className="bg-[#25D366]/15 text-[#128C7E] hover:bg-[#25D366]/15 border border-[#25D366]/30 gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Conectado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-slate-500 border-slate-200 bg-slate-50">
                          <XCircle className="h-3 w-3" />
                          Não conectado
                        </Badge>
                      )}
                      {u.role === "super_admin" && <Badge className="bg-[#075E54] text-white hover:bg-[#075E54]">super_admin</Badge>}
                    </div>
                    <div className="text-sm text-[#128C7E]/80 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="select-all">{u.email}</span>
                    </div>
                    <div className="text-xs text-slate-500 space-x-3">
                      {u.meta_display_phone_number && (
                        <span>📱 WA: {u.meta_display_phone_number}</span>
                      )}
                      {u.whatsapp_profile_number && !u.meta_display_phone_number && (
                        <span>📱 {u.whatsapp_profile_number}</span>
                      )}
                      <span>Cadastro: {new Date(u.created_at).toLocaleDateString("pt-BR")}</span>
                      {u.last_sign_in_at && (
                        <span>Último login: {new Date(u.last_sign_in_at).toLocaleDateString("pt-BR")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => openInsights(u)} className="bg-white border-[#E8F5F1] text-[#075E54] hover:bg-[#F0FDF4]">
                      <BarChart3 className="h-4 w-4 mr-1" /> Insights
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openPwdDialog(u)} className="bg-white border-[#E8F5F1] text-[#075E54] hover:bg-[#F0FDF4]">
                      <KeyRound className="h-4 w-4 mr-1" /> Nova senha
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleSendReset(u)} className="bg-white border-[#E8F5F1] text-[#075E54] hover:bg-[#F0FDF4]">
                      <Mail className="h-4 w-4 mr-1" /> Lembrar acesso
                    </Button>
                    {u.connected && (
                      <Button size="sm" onClick={() => handleImpersonate(u)} className="bg-[#25D366] text-white hover:bg-[#1eb356]">
                        <ExternalLink className="h-4 w-4 mr-1" /> Acessar WhatsApp
                      </Button>
                    )}
                    {u.connected && (
                      <Button size="sm" variant="outline" onClick={() => handleDisconnect(u)} className="bg-white border-amber-200 text-amber-700 hover:bg-amber-50">
                        <Power className="h-4 w-4 mr-1" /> Desconectar
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(u)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Excluir
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {filtered.length === 0 && (
              <Card className="p-8 text-center text-[#128C7E]/70 bg-white border-[#E8F5F1]">Nenhum cadastro encontrado</Card>
            )}
            {!showAll && filtered.length > 10 && (
              <Button
                variant="outline"
                onClick={() => setShowAll(true)}
                className="bg-white border-[#E8F5F1] text-[#075E54] hover:bg-[#F0FDF4] mx-auto"
              >
                Ver todos ({filtered.length})
              </Button>
            )}
            {showAll && filtered.length > 10 && (
              <Button
                variant="outline"
                onClick={() => setShowAll(false)}
                className="bg-white border-[#E8F5F1] text-[#075E54] hover:bg-[#F0FDF4] mx-auto"
              >
                Mostrar menos
              </Button>
            )}
          </div>
        ))}
          </TabsContent>

          <TabsContent value="announcements" className="mt-4">
            <AnnouncementsAdminPanel creds={creds} />
          </TabsContent>

          <TabsContent value="sales" className="mt-4">
            <SalesOrdersPanel creds={creds} />
          </TabsContent>

          <TabsContent value="trials" className="mt-4">
            <TrialsPanel creds={creds} />
          </TabsContent>

          <TabsContent value="tutorials" className="mt-4">
            <TutorialsAdminPanel />
          </TabsContent>

          <TabsContent value="migration" className="mt-4">
            <MigrationPanel creds={creds} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Insights dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md bg-white border-[#E8F5F1] text-[#075E54]">
          <DialogHeader>
            <DialogTitle className="text-[#075E54]">Insights do usuário</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="text-sm">
                <div className="font-medium">{selected.full_name || selected.email}</div>
                <div className="text-[#128C7E]/70">{selected.email}</div>
              </div>
              {loadingInsights || !insights ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-[#128C7E]/60" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3 bg-[#F0FDF4] border-[#E8F5F1] text-[#075E54]">
                    <div className="text-xs text-[#128C7E]/70">Mensagens recebidas</div>
                    <div className="text-2xl font-bold text-[#075E54]">{insights.totalReceived}</div>
                  </Card>
                  <Card className="p-3 bg-[#F0FDF4] border-[#E8F5F1] text-[#075E54]">
                    <div className="text-xs text-[#128C7E]/70">Mensagens enviadas</div>
                    <div className="text-2xl font-bold text-[#075E54]">{insights.totalSent}</div>
                  </Card>
                  <Card className="p-3 bg-[#F0FDF4] border-[#E8F5F1] text-[#075E54]">
                    <div className="text-xs text-[#128C7E]/70">Contatos</div>
                    <div className="text-2xl font-bold text-[#075E54]">{insights.totalContacts}</div>
                  </Card>
                  <Card className="p-3 bg-[#F0FDF4] border-[#E8F5F1] text-[#075E54]">
                    <div className="text-xs text-[#128C7E]/70">Conversas cobradas</div>
                    <div className="text-2xl font-bold text-[#075E54]">{insights.paidConversations}</div>
                  </Card>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Password dialog */}
      <Dialog open={pwdDialogOpen} onOpenChange={setPwdDialogOpen}>
        <DialogContent className="max-w-md bg-white border-[#E8F5F1] text-[#075E54]">
          <DialogHeader>
            <DialogTitle className="text-[#075E54]">Definir nova senha</DialogTitle>
          </DialogHeader>
          {pwdTarget && (
            <div className="space-y-3">
              <p className="text-sm text-[#128C7E]/80">
                Defina uma nova senha para <strong>{pwdTarget.email}</strong>. Copie e envie ao usuário — senhas atuais
                não podem ser recuperadas pois ficam criptografadas.
              </p>
              <div className="flex gap-2">
                <Input value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="bg-[#F0FDF4] border-[#E8F5F1] text-[#075E54]" />
                <Button
                  type="button"
                  variant="outline"
                  className="bg-white border-[#E8F5F1] text-[#075E54] hover:bg-[#F0FDF4]"
                  onClick={() => {
                    navigator.clipboard.writeText(newPwd);
                    toast.success("Copiado");
                  }}
                >
                  Copiar
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setNewPwd(generatePwd())} className="text-[#128C7E] hover:bg-[#F0FDF4]">
                Gerar outra
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdDialogOpen(false)} className="bg-white border-[#E8F5F1] text-[#075E54] hover:bg-[#F0FDF4]">
              Cancelar
            </Button>
            <Button onClick={savePassword} disabled={savingPwd} className="bg-[#25D366] hover:bg-[#128C7E] text-white">
              {savingPwd ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
