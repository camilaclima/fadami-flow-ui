import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "A senha deve ter no mínimo 8 caracteres.";
  if (!/[A-Z]/.test(pw)) return "Inclua ao menos uma letra maiúscula.";
  if (!/[a-z]/.test(pw)) return "Inclua ao menos uma letra minúscula.";
  if (!/[0-9]/.test(pw)) return "Inclua ao menos um número.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Inclua ao menos um caractere especial.";
  return null;
}

export default function ChangePasswordPage() {
  const { profile } = useAuth();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    setLoading(false);
    if (updateErr) { setError(updateErr.message); return; }

    setCurrent(""); setPassword(""); setConfirm("");
    toast.success("Senha alterada com sucesso!");
  };

  return (
    <div className="fade-in space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Alterar Senha</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Atualize sua senha de acesso seguindo as diretrizes de segurança.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-4">
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

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Mínimo 8 caracteres com maiúscula, minúscula, número e caractere especial.
        </p>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading} className="h-11 rounded-xl">
            {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>) : (<><KeyRound className="w-4 h-4 mr-2" />Alterar senha</>)}
          </Button>
        </div>
      </form>
    </div>
  );
}