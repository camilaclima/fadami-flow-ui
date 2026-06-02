import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { FadamiFlowLogo } from "@/components/FadamiFlowLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
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
            <p className="text-sm text-muted-foreground text-center">
              {sent ? "Verifique sua caixa de entrada" : "Informe seu e-mail para receber o link de redefinição"}
            </p>
          </div>

          {sent ? (
            <div className="space-y-4">
              <Alert className="rounded-xl">
                <MailCheck className="h-4 w-4" />
                <AlertDescription>
                  Se houver uma conta vinculada a este e-mail, enviaremos um link para você criar uma nova senha.
                </AlertDescription>
              </Alert>
              <Link to="/login">
                <Button variant="outline" className="w-full h-11 rounded-xl">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao login
                </Button>
              </Link>
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
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email" type="email" required autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="h-11 rounded-xl bg-background/70 backdrop-blur-sm"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl font-medium">
                {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>) : "Enviar link de redefinição"}
              </Button>
              <Link to="/login" className="block text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-3 h-3 inline mr-1" /> Voltar ao login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}