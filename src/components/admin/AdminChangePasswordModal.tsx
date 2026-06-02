import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, KeyRound, Loader2, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Profile } from "@/hooks/useProfiles";

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "A senha deve ter no mínimo 8 caracteres.";
  if (!/[A-Z]/.test(pw)) return "Inclua ao menos uma letra maiúscula.";
  if (!/[a-z]/.test(pw)) return "Inclua ao menos uma letra minúscula.";
  if (!/[0-9]/.test(pw)) return "Inclua ao menos um número.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Inclua ao menos um caractere especial.";
  return null;
}

function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const nums = "23456789";
  const sym = "!@#$%&*?";
  const all = upper + lower + nums + sym;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  let pw = pick(upper) + pick(lower) + pick(nums) + pick(sym);
  for (let i = 0; i < 8; i++) pw += pick(all);
  return pw.split("").sort(() => Math.random() - 0.5).join("");
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: Profile | null;
}

export function AdminChangePasswordModal({ open, onOpenChange, profile }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setConfirm("");
      setError("");
      setCopied(false);
    }
  }, [open]);

  const handleGenerate = () => {
    const pw = generatePassword();
    setPassword(pw);
    setConfirm(pw);
    setError("");
  };

  const handleCopy = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!profile) return;
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    const v = validatePassword(password);
    if (v) { setError(v); return; }

    setLoading(true);
    const { data, error: fnErr } = await supabase.functions.invoke("admin-change-password", {
      body: { targetUserId: profile.user_id, newPassword: password },
    });
    setLoading(false);

    if (fnErr) { setError(fnErr.message); return; }
    if (data?.error) { setError(data.error); return; }

    toast.success(`Senha de ${profile.first_name} alterada com sucesso!`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            Alterar senha do usuário
          </DialogTitle>
          <DialogDescription>
            {profile ? (
              <>Defina uma nova senha para <span className="font-medium text-foreground">{profile.first_name} {profile.last_name}</span> ({profile.email}).</>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="pw">Nova senha</Label>
              <button type="button" onClick={handleGenerate} className="text-xs text-primary hover:underline">
                Gerar senha
              </button>
            </div>
            <div className="flex gap-2">
              <Input id="pw" type="text" value={password} onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl font-mono" autoComplete="new-password" required />
              <Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-xl" onClick={handleCopy} disabled={!password}>
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar nova senha</Label>
            <Input id="confirm" type="text" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="h-11 rounded-xl font-mono" autoComplete="new-password" required />
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Mínimo 8 caracteres com maiúscula, minúscula, número e caractere especial.
            A alteração será registrada para fins de auditoria.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>) : "Alterar senha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}