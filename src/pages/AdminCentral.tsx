import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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

const STORAGE_KEY = "admincentral_creds_v1";

export default function AdminCentral() {
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

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

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await call("list_users");
      setUsers(data.users || []);
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar usuários");
      if ((err.message || "").includes("Credenciais")) logout();
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

  async function handleSendReset(u: AdminUser) {
    try {
      await call("send_reset_email", { email: u.email, redirectTo: `${window.location.origin}/crm/login` });
      toast.success("E-mail de redefinição enviado");
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 space-y-4">
          <div>
            <h1 className="text-2xl font-bold">Admin Central</h1>
            <p className="text-sm text-muted-foreground">Acesso restrito ao administrador principal</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Senha</Label>
              <Input
                type="password"
                value={loginPwd}
                onChange={(e) => setLoginPwd(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" disabled={loggingIn} className="w-full">
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Admin Central</h1>
            <p className="text-sm text-muted-foreground">
              {users.length} cadastros · {connectedCount} conectados
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Recarregar
            </Button>
            <Button variant="outline" size="sm" onClick={logout}>
              Sair
            </Button>
          </div>
        </div>

        <Card className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por e-mail, nome ou número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((u) => (
              <Card key={u.id} className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{u.full_name || u.email}</span>
                      {u.connected ? (
                        <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/15 gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Conectado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-muted-foreground">
                          <XCircle className="h-3 w-3" />
                          Não conectado
                        </Badge>
                      )}
                      {u.role === "super_admin" && <Badge variant="secondary">super_admin</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="select-all">{u.email}</span>
                    </div>
                    <div className="text-xs text-muted-foreground space-x-3">
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
                    <Button size="sm" variant="outline" onClick={() => openInsights(u)}>
                      <BarChart3 className="h-4 w-4 mr-1" /> Insights
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openPwdDialog(u)}>
                      <KeyRound className="h-4 w-4 mr-1" /> Nova senha
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleSendReset(u)}>
                      <Mail className="h-4 w-4 mr-1" /> Reset e-mail
                    </Button>
                    {u.connected && (
                      <Button size="sm" variant="outline" onClick={() => handleDisconnect(u)}>
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
              <Card className="p-8 text-center text-muted-foreground">Nenhum cadastro encontrado</Card>
            )}
          </div>
        )}
      </div>

      {/* Insights dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Insights do usuário</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="text-sm">
                <div className="font-medium">{selected.full_name || selected.email}</div>
                <div className="text-muted-foreground">{selected.email}</div>
              </div>
              {loadingInsights || !insights ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Mensagens recebidas</div>
                    <div className="text-2xl font-bold">{insights.totalReceived}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Mensagens enviadas</div>
                    <div className="text-2xl font-bold">{insights.totalSent}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Contatos</div>
                    <div className="text-2xl font-bold">{insights.totalContacts}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Conversas cobradas</div>
                    <div className="text-2xl font-bold">{insights.paidConversations}</div>
                  </Card>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Password dialog */}
      <Dialog open={pwdDialogOpen} onOpenChange={setPwdDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Definir nova senha</DialogTitle>
          </DialogHeader>
          {pwdTarget && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Defina uma nova senha para <strong>{pwdTarget.email}</strong>. Copie e envie ao usuário — senhas atuais
                não podem ser recuperadas pois ficam criptografadas.
              </p>
              <div className="flex gap-2">
                <Input value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(newPwd);
                    toast.success("Copiado");
                  }}
                >
                  Copiar
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setNewPwd(generatePwd())}>
                Gerar outra
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={savePassword} disabled={savingPwd}>
              {savingPwd ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
