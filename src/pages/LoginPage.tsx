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
    <div
      className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at top left, #1e1b4b 0%, #0b1024 45%, #05060f 100%)",
      }}
    >
      {/* Decorative blurred color blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full opacity-50"
        style={{ background: "radial-gradient(circle, #4338ca 0%, transparent 70%)", filter: "blur(80px)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-32 w-[560px] h-[560px] rounded-full opacity-40"
        style={{ background: "radial-gradient(circle, #6d28d9 0%, transparent 70%)", filter: "blur(90px)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 right-1/4 w-[320px] h-[320px] rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)", filter: "blur(70px)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      <div className="relative w-full max-w-md animate-fade-in">
        <div
          className="rounded-2xl p-7 sm:p-9 shadow-2xl"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 25px 60px -15px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex flex-col items-center gap-3 mb-7 text-white">
            <div className="scale-125">
              <FadamiFlowLogo showIcon />
            </div>
            <p className="text-sm text-white/70 text-center">
              Entre com suas credenciais para acessar o sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert
                variant="destructive"
                className="rounded-xl border-red-400/30 bg-red-500/15 text-red-100 [&>svg]:text-red-200"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/80">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-primary/60 focus-visible:border-primary/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/80">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-primary/60 focus-visible:border-primary/50"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-xl font-semibold text-primary-foreground transition-all hover:scale-[1.01]"
              disabled={loading}
              style={{
                boxShadow:
                  "0 10px 30px -8px hsl(var(--primary) / 0.55), 0 0 0 1px hsl(var(--primary) / 0.4), inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Entrando...</>
              ) : (
                <><LogIn className="w-4 h-4 mr-2" />Entrar</>
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-xs text-center text-white/40">
          © {new Date().getFullYear()} FadamiFlow — O Fluxo Total do seu Projeto
        </p>
      </div>
    </div>
  );
}
