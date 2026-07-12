import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, KeyRound, Loader2, Check, X, ShieldCheck } from "lucide-react";
import { FadamiFlowLogo } from "@/components/FadamiFlowLogo";
import { toast } from "sonner";

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "A senha deve ter no mínimo 8 caracteres.";
  if (!/[A-Z]/.test(pw)) return "Inclua ao menos uma letra maiúscula.";
  if (!/[a-z]/.test(pw)) return "Inclua ao menos uma letra minúscula.";
  if (!/[0-9]/.test(pw)) return "Inclua ao menos um número.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Inclua ao menos um caractere especial.";
  return null;
}

function translateAuthError(msg: string): string {
  const m = (msg || "").toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials") || m.includes("invalid grant"))
    return "Senha atual incorreta.";
  if (m.includes("new password should be different") || m.includes("same as the old"))
    return "A nova senha deve ser diferente da atual.";
  if (m.includes("password should be at least"))
    return "A senha não atende ao tamanho mínimo exigido.";
  if (m.includes("password") && m.includes("weak"))
    return "Senha muito fraca. Escolha uma senha mais forte.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas. Aguarde alguns instantes e tente novamente.";
  if (m.includes("network") || m.includes("failed to fetch"))
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  if (m.includes("session")) return "Sessão inválida. Faça login novamente.";
  return "Não foi possível alterar a senha. Tente novamente.";
}

export default function ChangePasswordPage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const isFirstAccess = !!profile?.first_access;
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const rules = [
    { label: "Mínimo de 8 caracteres", ok: password.length >= 8 },
    { label: "Uma letra maiúscula", ok: /[A-Z]/.test(password) },
    { label: "Uma letra minúscula", ok: /[a-z]/.test(password) },
    { label: "Um número", ok: /[0-9]/.test(password) },
    { label: "Um caractere especial", ok: /[^A-Za-z0-9]/.test(password) },
    { label: "Senhas coincidem", ok: password.length > 0 && password === confirm },
    { label: "Diferente da senha atual", ok: password.length > 0 && password !== current },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!profile?.email) {
      setError("Sessão inválida. Faça login novamente.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    if (current === password) {
      setError("A nova senha deve ser diferente da atual.");
      return;
    }
    const v = validatePassword(password);
    if (v) { setError(v); return; }

    setLoading(true);
    // Reautenticação: tenta um signIn com a senha atual para validar.
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: current,
    });
    if (reauthErr) {
      setLoading(false);
      setError("Senha atual incorreta.");
      return;
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password });
    if (updateErr) {
      setLoading(false);
      setError(translateAuthError(updateErr.message));
      return;
    }

    // Marca first_access como concluído
    if (profile?.id) {
      await supabase.from("profiles").update({ first_access: false }).eq("id", profile.id);
      await refreshProfile();
    }
    setLoading(false);

    setCurrent(""); setPassword(""); setConfirm("");
    toast.success("Senha alterada com sucesso!");
    if (isFirstAccess) navigate("/", { replace: true });
  };

  const formCard = (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 sm:p-7 space-y-4 shadow-xl">
      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="current">Senha atual</Label>
        <Input id="current" type="password" required value={current}
          onChange={(e) => setCurrent(e.target.value)} className="h-11 rounded-xl"
          autoComplete="current-password" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="new">Nova senha</Label>
        <Input id="new" type="password" required value={password}
          onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-xl"
          autoComplete="new-password" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">Confirmar nova senha</Label>
        <Input id="confirm" type="password" required value={confirm}
          onChange={(e) => setConfirm(e.target.value)} className="h-11 rounded-xl"
          autoComplete="new-password" />
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> Regras de senha
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
          {rules.map((r) => (
            <li key={r.label} className={`flex items-center gap-2 text-xs transition-colors ${r.ok ? "text-emerald-500" : "text-muted-foreground"}`}>
              {r.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5 opacity-60" />}
              <span className={r.ok ? "font-medium" : ""}>{r.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl">
        {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>) : (<><KeyRound className="w-4 h-4 mr-2" />Alterar senha</>)}
      </Button>
    </form>
  );

  if (isFirstAccess) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-background">
        <div aria-hidden className="absolute inset-0 -z-10 opacity-70 dark:opacity-50" style={{
          background:
            "radial-gradient(60% 50% at 15% 20%, hsl(var(--primary) / 0.25), transparent 60%), radial-gradient(55% 45% at 85% 80%, hsl(217 91% 60% / 0.22), transparent 65%)",
        }} />
        <div className="w-full max-w-md animate-fade-in space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="scale-125"><FadamiFlowLogo showIcon /></div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-foreground">Primeiro acesso</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Sua senha atual é temporária. Defina uma nova senha para continuar.
              </p>
            </div>
          </div>
          {formCard}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Alterar Senha</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Atualize sua senha de acesso seguindo as diretrizes de segurança.
        </p>
      </div>
      {formCard}
    </div>
  );
}