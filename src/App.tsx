import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
                <Route path="/cockpit" element={<DashboardPage />} />
                <Route path="/change-password" element={<ChangePasswordPage />} />
                <Route path="/backlogs" element={<BacklogsPage />} />
                <Route path="/team" element={<TeamMembersPage />} />
                <Route path="/sprints" element={<SprintsPage />} />
                <Route path="/daily-status" element={<DailyStatusPage />} />
                <Route path="/daily-status/squad/:squadId" element={<DailyStatusProjectDetailPage />} />
                <Route path="/daily-status/:productId" element={<DailyStatusProjectDetailPage />} />
                <Route path="/squads" element={<SquadsPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/roles" element={<RolesPage />} />
                <Route path="/groups" element={<AccessGroupsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
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
