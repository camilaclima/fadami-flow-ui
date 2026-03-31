import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "../ThemeToggle";
import { FadamiFlowLogo } from "@/components/FadamiFlowLogo";
import { Outlet, useNavigate } from "react-router-dom";
import { Bell, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function AppLayout() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const initials = profile
    ? `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}`.toUpperCase() || "U"
    : "U";

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="ml-16">
        <header className="h-14 border-b border-border/60 flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <FadamiFlowLogo showTagline />
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <ThemeToggle />
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
              {initials}
            </div>
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>
        <main className="px-6 py-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
