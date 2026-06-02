import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Loader2, Lock } from "lucide-react";
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

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase recovery: when the user lands here from the email link,
    // the SDK exchanges the code/hash automatically and emits PASSWORD_RECOVERY.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    const v = validatePassword(password);
    if (v) { setError(v); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    toast.success("Senha redefinida com sucesso!");
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-background">
      <div aria-hidden className="absolute inset-0 -z-10 opacity-70 dark:opacity-50" style={{
        background:
          "radial-gradient(60% 50% at 15% 20%, hsl(var(--primary) / 0.25), transparent 60%), radial-gradient(55% 45% at 85% 80%, hsl(217 91% 60% / 0.22), transparent 65%)",
      }} />
      <div className="w-full max-w-md animate-fade-in">
        <div className="rounded-2xl border border-white/15 dark:border-white/10 bg-white/60 dark:bg-card/40 backdrop-blur-xl shadow-2xl shadow-primary/10 p-7 sm:p-9">
          <div className="flex flex-col items-center gap-3 mb-7">
            <div className="scale-125"><FadamiFlowLogo showIcon /></div>
            <p className="text-sm text-muted-foreground text-center">Defina sua nova senha</p>
          </div>

          {!ready ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <Input id="password" type="password" required value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="h-11 rounded-xl bg-background/70" autoComplete="new-password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar senha</Label>
                <Input id="confirm" type="password" required value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••"
                  className="h-11 rounded-xl bg-background/70" autoComplete="new-password" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Mínimo 8 caracteres com maiúscula, minúscula, número e caractere especial.
              </p>
              <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl font-medium">
                {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>) : (<><Lock className="w-4 h-4 mr-2" />Redefinir senha</>)}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}