import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDailySim } from "@/contexts/DailySimContext";

/**
 * Decide a página inicial conforme as permissões do usuário.
 * - GP (grupo líderes) → Painel do GP (/dailys/painel)
 * - Dev (grupo desenvolvedor) → Minha Daily (/dailys/registro)
 * - Tem "dashboard" → cockpit executivo (/cockpit)
 * - Senão tem "daily" → Saúde do Projeto (/daily-status)
 * - Senão cai no primeiro módulo permitido conhecido
 * - Sem permissões → /daily-status (placeholder seguro)
 */
export default function HomeRedirect() {
  const { permissions, loading } = useAuth();
  const { current: sim, loading: simLoading } = useDailySim();

  if (loading || simLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Redirecionamento preferencial por papel no módulo Daily
  if (sim.role === "gp") return <Navigate to="/dailys/painel" replace />;
  if (sim.role === "dev") return <Navigate to="/dailys/registro" replace />;

  const has = (p: string) => permissions.includes(p);

  if (has("dashboard")) return <Navigate to="/cockpit" replace />;
  if (has("daily")) return <Navigate to="/daily-status" replace />;
  if (has("backlogs")) return <Navigate to="/backlogs" replace />;
  if (has("sprints")) return <Navigate to="/sprints" replace />;
  if (has("team")) return <Navigate to="/team" replace />;
  if (has("squads")) return <Navigate to="/squads" replace />;
  if (has("products")) return <Navigate to="/products" replace />;
  if (has("clients")) return <Navigate to="/clients" replace />;
  if (has("users")) return <Navigate to="/users" replace />;
  if (has("settings")) return <Navigate to="/settings" replace />;

  return <Navigate to="/daily-status" replace />;
}
