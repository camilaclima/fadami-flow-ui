import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, Outlet } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext"; // Importando useAuth para ler a role do usuário
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

// Componente de Proteção para rotas exclusivas de Administrador
const AdminRoute = () => {
  const { user, loading } = useAuth(); // Busca o usuário do contexto de autenticação

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Verifica se a role no user_metadata do Supabase é 'admin' (ignorando maiúsculas/minúsculas)
  const isAdmin = user?.user_metadata?.role?.toLowerCase() === "admin";

  if (!isAdmin) {
    // Se não for admin, redireciona o Líder/Dev de volta para o painel de dailies
    return <Navigate to="/dailys/painel" replace />;
  }

  // Se for admin, renderiza a página normalmente
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

            {/* 1. Rota Protegida de Login Geral */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/cockpit" element={<DashboardPage />} />
                <Route path="/change-password" element={<ChangePasswordPage />} />
                <Route path="/backlogs" element={<BacklogsPage />} />
                <Route path="/team" element={<TeamMembersPage />} />
                <Route path="/sprints" element={<SprintsPage />} />
                <Route path="/daily-status" element={<DailyStatusPage />} />
                <Route path="/daily-status/squad/:squadId" element={<DailyStatusProjectDetailPage />} />
                <Route path="/daily-status/:productId" element={<DailyStatusProjectDetailPage />} />
                <Route path="/squads" element={<SquadsPage />} />
                <Route path="/team-project-config" element={<TeamProjectConfigPage />} />
                <Route path="/controle-gestao" element={<ControleGestaoPage />} />

                {/* Dailies */}
                <Route path="/dailys" element={<DailysLayout />}>
                  <Route path="registro" element={<DailysRegistroPage />} />
                  <Route path="painel" element={<DailysPainelGPPage />} />
                  <Route path="historico" element={<DailysHistoricoPage />} />
                  <Route path="saude" element={<DailysSaudePage />} />
                </Route>

                <Route path="/products" element={<ProductsPage />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/settings" element={<SettingsPage />} />

                {/* 2. SUB-ROTA PROTEGIDA: Apenas Administradores acessam estes caminhos */}
                <Route element={<AdminRoute />}>
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
