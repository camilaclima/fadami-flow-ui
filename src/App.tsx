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

interface RoleProtectedRouteProps {
  allowedRoles: string[];
}

const RoleProtectedRoute = ({ allowedRoles }: RoleProtectedRouteProps) => {
  // Destrutor tolerante caso o AuthContext tenha 'profile' como propriedade irmã
  const auth = useAuth() as any;
  const user = auth?.user;
  const profile = auth?.profile;
  const loading = auth?.loading;

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se não houver usuário logado, o ProtectedRoute pai já deveria barrar, mas por segurança mandamos para o login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Tenta ler a role de todas as formas possíveis (metadados, objeto de perfil irmão ou propriedades diretas)
  const rawRole = profile?.role || user?.user_metadata?.role || user?.role || profile?.user_role || "";

  const userRole = rawRole.toString().toLowerCase().trim();

  // Se o perfil ainda está carregando no banco e a role veio vazia, mostramos um loading temporário em vez de deslogar/redirecionar imediatamente
  if (user && !userRole) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase().trim());
  const hasAccess = normalizedAllowedRoles.includes(userRole);

  if (!hasAccess) {
    // Redireciona para o registro seguro se não tiver acesso
    return <Navigate to="/dailys/registro" replace />;
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

                {/* 1. Área Geral: Acesso para todos os níveis de usuário */}
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

                {/* 2. Área de Gestão: Apenas Líderes, Gestores e Admins */}
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

                {/* 3. Área Crítica administrativa: Apenas Administradores */}
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
