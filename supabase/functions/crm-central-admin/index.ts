import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "mro@gmail.com";
const ADMIN_PASSWORD = "Ga145523@";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { action, adminEmail, adminPassword } = body as any;

    if (
      (adminEmail || "").toString().trim().toLowerCase() !== ADMIN_EMAIL ||
      (adminPassword || "").toString() !== ADMIN_PASSWORD
    ) {
      return json({ success: false, error: "Credenciais inválidas" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (action === "login") {
      return json({ success: true });
    }

    if (action === "list_users") {
      // Get all auth users (paginated)
      const allUsers: any[] = [];
      let page = 1;
      while (true) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        allUsers.push(...(data.users || []));
        if (!data.users || data.users.length < 1000) break;
        page++;
        if (page > 20) break;
      }

      const userIds = allUsers.map((u) => u.id);

      const { data: profiles } = await supabase
        .from("crm_profiles")
        .select("user_id, full_name, whatsapp_number, role, created_at")
        .in("user_id", userIds);

      const { data: settings } = await supabase
        .from("crm_settings")
        .select(
          "user_id, meta_phone_number_id, meta_display_phone_number, meta_verified_name, meta_waba_id, meta_access_token"
        )
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      const settingsMap = new Map((settings || []).map((s: any) => [s.user_id, s]));

      const users = allUsers.map((u) => {
        const s: any = settingsMap.get(u.id) || {};
        const p: any = profileMap.get(u.id) || {};
        const connected = !!(s.meta_access_token && s.meta_phone_number_id);
        return {
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          full_name: p.full_name || null,
          whatsapp_profile_number: p.whatsapp_number || null,
          role: p.role || "user",
          meta_display_phone_number: s.meta_display_phone_number || null,
          meta_verified_name: s.meta_verified_name || null,
          meta_phone_number_id: s.meta_phone_number_id || null,
          connected,
        };
      });

      // Sort newest first
      users.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return json({ success: true, users });
    }

    if (action === "user_insights") {
      const { userId } = body as any;
      if (!userId) return json({ success: false, error: "userId obrigatório" }, 400);

      // Total messages
      const { count: totalReceived } = await supabase
        .from("crm_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("direction", "inbound");

      const { count: totalSent } = await supabase
        .from("crm_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("direction", "outbound");

      const { count: totalContacts } = await supabase
        .from("crm_contacts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      // Paid conversations: somente as mensagens onde a própria Meta marcou
      // pricing.billable = true no status retornado. Conversas dentro da janela
      // de 24h (free_customer_service) NÃO são cobradas e devem ficar fora.
      const { data: outboundMsgs } = await supabase
        .from("crm_messages")
        .select("contact_id, created_at, metadata")
        .eq("user_id", userId)
        .eq("direction", "outbound")
        .order("created_at", { ascending: true })
        .limit(50000);

      let paidConversations = 0;
      const seenConvKey = new Set<string>();
      for (const m of outboundMsgs || []) {
        const meta: any = (m as any).metadata || {};
        const src = meta.source;
        if (src === "echo_mobile_app" || src === "meta_webhook_echo") continue;

        const pricing = meta.last_meta_status?.pricing || meta.pricing;
        // Sem pricing confirmado pela Meta, não contamos como cobrada.
        if (!pricing) continue;
        // Meta envia billable=false para free_customer_service / free_entry_point.
        const isBillable =
          pricing.billable === true ||
          (pricing.category && pricing.category !== "service" && pricing.category !== "free_customer_service" && pricing.category !== "referral_conversion");
        if (!isBillable) continue;

        // Deduplica por contato + categoria + dia (1 conversa cobrada por janela)
        const day = new Date((m as any).created_at).toISOString().slice(0, 10);
        const key = `${(m as any).contact_id}-${pricing.category || "x"}-${day}`;
        if (seenConvKey.has(key)) continue;
        seenConvKey.add(key);
        paidConversations++;
      }

      return json({
        success: true,
        insights: {
          totalReceived: totalReceived || 0,
          totalSent: totalSent || 0,
          totalContacts: totalContacts || 0,
          paidConversations,
        },
      });
    }

    if (action === "set_password") {
      const { userId, newPassword } = body as any;
      if (!userId || !newPassword || newPassword.length < 6) {
        return json({ success: false, error: "Senha inválida (mínimo 6 caracteres)" }, 400);
      }
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
      });
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "send_reset_email") {
      const { email, redirectTo } = body as any;
      if (!email) return json({ success: false, error: "Email obrigatório" }, 400);
      const { error } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: redirectTo || undefined },
      });
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "delete_user") {
      const { userId } = body as any;
      if (!userId) return json({ success: false, error: "userId obrigatório" }, 400);

      // Clean ALL dependent data first (FK to auth.users would block delete)
      const tables = [
        "crm_webhook_delivery_logs",
        "crm_webhooks",
        "crm_scheduled_messages",
        "crm_flow_executions",
        "crm_flow_steps",
        "crm_flows",
        "crm_broadcasts",
        "crm_activities",
        "crm_messages",
        "crm_metrics",
        "crm_statuses",
        "crm_templates",
        "crm_google_tokens",
        "crm_google_accounts",
        "crm_access_logs",
        "crm_contacts",
        "crm_settings",
        "crm_profiles",
        "mro_images",
        "mro_schedules",
        "mro_strategies",
        "mro_profiles",
        "user_roles",
      ];
      for (const t of tables) {
        const { error: delErr } = await supabase.from(t).delete().eq("user_id", userId);
        if (delErr) console.warn(`[delete_user] cleanup ${t}:`, delErr.message);
      }

      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) {
        console.error("[delete_user] auth.admin.deleteUser failed:", error);
        return json({
          success: false,
          error: `Falha ao excluir usuário: ${error.message}`,
        }, 500);
      }
      return json({ success: true });
    }

    if (action === "disconnect_whatsapp") {
      const { userId } = body as any;
      if (!userId) return json({ success: false, error: "userId obrigatório" }, 400);
      const { error } = await supabase
        .from("crm_settings")
        .update({
          meta_access_token: null,
          meta_phone_number_id: null,
          meta_waba_id: null,
          meta_app_id: null,
          meta_app_secret: null,
          meta_display_phone_number: null,
          meta_verified_name: null,
        })
        .eq("user_id", userId);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "list_announcements") {
      const { data, error } = await supabase
        .from("admin_announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({ success: true, announcements: data || [] });
    }

    if (action === "create_announcement") {
      const { title, message, frequency, start_date, end_date, active } = body as any;
      if (!title || !message) return json({ success: false, error: "Título e mensagem são obrigatórios" }, 400);
      const { data, error } = await supabase.from("admin_announcements").insert({
        title,
        message,
        frequency: frequency || "once",
        start_date: start_date || null,
        end_date: end_date || null,
        active: active !== false,
      }).select().single();
      if (error) throw error;
      return json({ success: true, announcement: data });
    }

    if (action === "update_announcement") {
      const { id, ...rest } = body as any;
      if (!id) return json({ success: false, error: "id obrigatório" }, 400);
      const patch: any = {};
      for (const k of ["title","message","frequency","start_date","end_date","active"]) {
        if (k in rest) patch[k] = rest[k];
      }
      const { error } = await supabase.from("admin_announcements").update(patch).eq("id", id);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "delete_announcement") {
      const { id } = body as any;
      if (!id) return json({ success: false, error: "id obrigatório" }, 400);
      const { error } = await supabase.from("admin_announcements").delete().eq("id", id);
      if (error) throw error;
      return json({ success: true });
    }

    return json({ success: false, error: "Ação inválida" }, 400);
  } catch (e: any) {
    console.error("[crm-central-admin] error:", e);
    return json({ success: false, error: e.message || "Erro interno" }, 500);
  }
});
