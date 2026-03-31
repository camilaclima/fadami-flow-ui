import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "../ThemeToggle";
import { Outlet, useNavigate } from "react-router-dom";
import { Bell, LogOut } from "lucide-react";
import { useAdminStore } from "@/store/adminStore";
import { useMemo } from "react";

export function AppLayout() {
  const navigate = useNavigate();
  const logout = useAdminStore((s) => s.logout);
  const currentUserId = useAdminStore((s) => s.currentUserId);
  const users = useAdminStore((s) => s.users);

  const initials = useMemo(() => {
    const user = users.find((u) => u.id === currentUserId);
    return user ? `${user.firstName[0]}${user.lastName[0]}` : "U";
  }, [currentUserId, users]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="ml-16">
        <header className="h-14 border-b border-border/60 flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-2 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <ThemeToggle />
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
              {currentUser}
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
