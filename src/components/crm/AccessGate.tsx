import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

type Status =
  | { kind: "loading" }
  | { kind: "no-auth" }
  | { kind: "allowed"; mode: "admin" | "paid" | "trial" | "grandfathered"; daysLeft?: number }
  | { kind: "blocked"; reason: "trial" | "paid" };

export default function AccessGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  useEffect(() => {
    let cancel = false;
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancel) setStatus({ kind: "no-auth" });
        return;
      }
      const { data: profile } = await supabase
        .from("crm_profiles")
        .select("role, trial_ends_at, access_until, is_paid")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.role === "super_admin" || profile?.role === "admin") {
        if (!cancel) setStatus({ kind: "allowed", mode: "admin" });
        return;
      }

      const now = Date.now();
      const accessUntil = profile?.access_until ? new Date(profile.access_until).getTime() : 0;
      const trialEnds = profile?.trial_ends_at ? new Date(profile.trial_ends_at).getTime() : 0;

      if (profile?.is_paid && accessUntil > now) {
        const daysLeft = Math.ceil((accessUntil - now) / 86400000);
        if (!cancel) setStatus({ kind: "allowed", mode: "paid", daysLeft });
        return;
      }
      if (profile?.is_paid && accessUntil <= now && accessUntil > 0) {
        if (!cancel) setStatus({ kind: "blocked", reason: "paid" });
        return;
      }
      if (!profile?.trial_ends_at) {
        // Grandfathered (registered before trial system)
        if (!cancel) setStatus({ kind: "allowed", mode: "grandfathered" });
        return;
      }
      if (trialEnds > now) {
        const daysLeft = Math.ceil((trialEnds - now) / 86400000);
        if (!cancel) setStatus({ kind: "allowed", mode: "trial", daysLeft });
        return;
      }
      if (!cancel) setStatus({ kind: "blocked", reason: "trial" });
    }
    check();
    return () => { cancel = true; };
  }, []);

  if (status.kind === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0FDF4]">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (status.kind === "no-auth") {
    if (typeof window !== "undefined") window.location.replace("/crm/login");
    return null;
  }

  if (status.kind === "blocked") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-red-100 text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-100 mb-5">
            <Lock className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">
            {status.reason === "trial" ? "Seu teste grátis terminou" : "Seu plano expirou"}
          </h1>
          <p className="text-slate-600 mb-6">
            {status.reason === "trial"
              ? "Você usou seus 2 dias de acesso gratuito. Para continuar usando o CRM, escolha um plano."
              : "Seu plano venceu. Renove agora para continuar usando o CRM sem interrupções."}
          </p>
          <div className="space-y-2">
            <Button
              onClick={() => (window.location.href = "/vendas#precos")}
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              <Sparkles className="w-4 h-4 mr-2" /> Escolher um plano
            </Button>
            <Button
              variant="outline"
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/crm/login"; }}
              className="w-full"
            >
              Sair
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-5">
            Já pagou? Aguarde alguns instantes ou fale com o suporte.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {status.mode === "trial" && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white text-center text-sm font-semibold py-2 px-4 shadow">
          🎁 Teste grátis: {status.daysLeft} dia{status.daysLeft === 1 ? "" : "s"} restante{status.daysLeft === 1 ? "" : "s"} —{" "}
          <a href="/vendas#precos" className="underline">assine agora</a> para não perder o acesso.
        </div>
      )}
      <div className={status.mode === "trial" ? "pt-9" : ""}>{children}</div>
    </>
  );
}