import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn, AlertCircle, Loader2 } from "lucide-react";
import { FadamiFlowLogo } from "@/components/FadamiFlowLogo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await signIn(email, password);
    setLoading(false);

    if (signInError) {
      setError(signInError);
    } else {
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-background">
      {/* Background: gradient + abstract flow shapes */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-br from-background via-background to-background"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-70 dark:opacity-50"
        style={{
          background:
            "radial-gradient(60% 50% at 15% 20%, hsl(var(--primary) / 0.25), transparent 60%), radial-gradient(55% 45% at 85% 80%, hsl(217 91% 60% / 0.22), transparent 65%), radial-gradient(40% 35% at 50% 100%, hsl(var(--primary) / 0.18), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.07] dark:opacity-[0.09]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground) / 0.6) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
        }}
      />

      <div className="w-full max-w-md animate-fade-in">
        <div
          className="rounded-2xl border border-white/15 dark:border-white/10 bg-white/60 dark:bg-card/40 backdrop-blur-xl shadow-2xl shadow-primary/10 p-7 sm:p-9"
          style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
        >
          <div className="flex flex-col items-center gap-3 mb-7">
            <div className="scale-125">
              <FadamiFlowLogo showIcon />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Entre com suas credenciais para acessar o sistema
            </p>
          </div>

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
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 rounded-xl bg-background/70 backdrop-blur-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11 rounded-xl bg-background/70 backdrop-blur-sm"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-xl font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 hover:scale-[1.01]"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Entrando...</>
              ) : (
                <><LogIn className="w-4 h-4 mr-2" />Entrar</>
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-xs text-center text-muted-foreground">
          © {new Date().getFullYear()} FadamiFlow — O Fluxo Total do seu Projeto
        </p>
      </div>
    </div>
  );
}
