import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, Outlet } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import DashboardPage from "./pages/DashboardPage";
import HomeRedirect from "./pages/HomeRedirect";
import BacklogsPage from "./pages/BacklogsPage";
import ProductsPage from "./pages/ProductsPage";
import ClientsPage from "./pages/ClientsPage";
import SettingsPage from "./pages/SettingsPage";
import UsersPage from "./pages/UsersPage";
import RolesPage from "./pages/RolesPage";
import AccessGroupsPage from "./pages/AccessGroupsPage";
import TeamMembersPage from "./pages/TeamMembersPage";
import SprintsPage from "./pages/SprintsPage";
import DailyStatusPage from "./pages/DailyStatusPage";
import DailyStatusProjectDetailPage from "./pages/DailyStatusProjectDetailPage";
import SquadsPage from "./pages/SquadsPage";
import TeamProjectConfigPage from "./pages/TeamProjectConfigPage";
import ControleGestaoPage from "./pages/ControleGestaoPage";
import NotFound from "./pages/NotFound";
import DailysRegistroPage from "./pages/dailys/RegistroPage";
import DailysPainelGPPage from "./pages/dailys/PainelGPPage";
import DailysHistoricoPage from "./pages/dailys/HistoricoPage";
import DailysSaudePage from "./pages/dailys/SaudePage";
import DailysLayout from "./components/dailys/DailysLayout";

const queryClient = new QueryClient();

// Ícone de Escudo de Alerta idêntico ao do print
const ShieldAlertIcon = () => (
  <svg className="w-14 h-14 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286zm0 13.036h.008v.008H12v-.008z"
    />
  </svg>
);

interface RestrictedAccessProps {
  allowedRoles: string[];
}

// Componente visual que renderiza o card de bloqueio do print
const RestrictedAccess = ({ allowedRoles }: RestrictedAccessProps) => {
  // Mapeia as roles técnicas para nomes mais amigáveis e profissionais na tela
  const roleLabelsMap: Record<string, string> = {
    admin: "Administradores",
    gestor: "Gestores",
    coordenador: "Coordenadores",
    lider: "Líderes",
    líder: "Líderes",
    desenvolvedor: "Desenvolvedores",
    dev: "Desenvolvedores",
  };

  const friendlyRoles = allowedRoles
    .map((role) => roleLabelsMap[role.toLowerCase()] || role)
    .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicados
    .join(", ");

  return (
    <div className="flex items-center justify-center min-h-[70vh] w-full px-4">
      <div className="max-w-3xl w-full bg-[#FFF7F2] border border-[#FFE6D5] rounded-[24px] p-12 text-center flex flex-col items-center justify-center gap-4">
        <div className="p-2 rounded-full bg-orange-50">
          <ShieldAlertIcon />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Acesso restrito</h1>
        <p className="text-sm text-slate-500 max-w-md leading-relaxed">
          Esta área é exclusiva para perfis do tipo:{" "}
          <span className="font-semibold text-orange-600">{friendlyRoles}</span>.
        </p>
      </div>
    </div>
  );
};

interface RoleProtectedRouteProps {
  allowedRoles: string[];
}

const RoleProtectedRoute = ({ allowedRoles }: RoleProtectedRouteProps) => {
  const { user, loading } = useAuth() as any;

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const rawRole = user?.user_metadata?.role || user?.role || user?.profile?.role || "";

  const userRole = rawRole.toString().toLowerCase().trim();

  // Se o usuário não tem a role carregada ainda, bloqueamos preventivamente por segurança
  if (!userRole) {
    return <RestrictedAccess allowedRoles={allowedRoles} />;
  }

  const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase().trim());
  const hasAccess = normalizedAllowedRoles.includes(userRole);

  // EM VEZ DE REDIRECIONAR, RENDERIZA O CARD DE BLOQUEIO DENTRO DO LAYOUT
  if (!hasAccess) {
    return <RestrictedAccess allowedRoles={allowedRoles} />;
  }

  return <Outlet />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/change-password" element={<ChangePasswordPage />} />

                {/* 1. Área Geral: Acesso para todos os usuários logados */}
                <Route
                  element={
                    <RoleProtectedRoute
                      allowedRoles={["admin", "coordenador", "desenvolvedor", "gestor", "lider", "líder", "dev"]}
                    />
                  }
                >
                  <Route path="/dailys" element={<DailysLayout />}>
                    <Route path="registro" element={<DailysRegistroPage />} />
                  </Route>
                </Route>

                {/* 2. Área de Gestão: Apenas Líderes, Gestores, Coordenadores e Admins */}
                <Route
                  element={<RoleProtectedRoute allowedRoles={["admin", "coordenador", "gestor", "lider", "líder"]} />}
                >
                  <Route path="/cockpit" element={<DashboardPage />} />
                  <Route path="/backlogs" element={<BacklogsPage />} />
                  <Route path="/team" element={<TeamMembersPage />} />
                  <Route path="/sprints" element={<SprintsPage />} />
                  <Route path="/daily-status" element={<DailyStatusPage />} />
                  <Route path="/daily-status/squad/:squadId" element={<DailyStatusProjectDetailPage />} />
                  <Route path="/daily-status/:productId" element={<DailyStatusProjectDetailPage />} />
                  <Route path="/squads" element={<SquadsPage />} />
                  <Route path="/team-project-config" element={<TeamProjectConfigPage />} />
                  <Route path="/controle-gestao" element={<ControleGestaoPage />} />

                  <Route path="/dailys" element={<DailysLayout />}>
                    <Route path="painel" element={<DailysPainelGPPage />} />
                    <Route path="historico" element={<DailysHistoricoPage />} />
                    <Route path="saude" element={<DailysSaudePage />} />
                  </Route>

                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/clients" element={<ClientsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>

                {/* 3. Área Administrativa: Apenas Administradores */}
                <Route element={<RoleProtectedRoute allowedRoles={["admin"]} />}>
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/roles" element={<RolesPage />} />
                  <Route path="/groups" element={<AccessGroupsPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
