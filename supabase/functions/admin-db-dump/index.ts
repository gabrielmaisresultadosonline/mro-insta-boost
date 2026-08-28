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
    const { action, adminEmail, adminPassword, table, offset, limit } = body as Record<string, unknown>;

    if (
      String(adminEmail ?? "").trim().toLowerCase() !== ADMIN_EMAIL ||
      String(adminPassword ?? "") !== ADMIN_PASSWORD
    ) {
      return json({ success: false, error: "Credenciais inválidas" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (action === "list_tables") {
      const { data, error } = await supabase.rpc("admin_list_public_tables");
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true, tables: data ?? [] });
    }

    if (action === "dump_schema") {
      const { data, error } = await supabase.rpc("admin_dump_schema");
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true, sql: data ?? "" });
    }

    if (action === "dump_rows") {
      const tableName = String(table ?? "");
      if (!tableName) return json({ success: false, error: "Tabela não informada" }, 400);
      const off = Number.isFinite(Number(offset)) ? Number(offset) : 0;
      const lim = Number.isFinite(Number(limit)) ? Number(limit) : 500;
      const { data, error } = await supabase.rpc("admin_dump_table_rows", {
        p_table: tableName,
        p_offset: off,
        p_limit: lim,
      });
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true, sql: data ?? "" });
    }

    return json({ success: false, error: `Ação inválida: ${String(action)}` }, 400);
  } catch (e) {
    return json({ success: false, error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});
