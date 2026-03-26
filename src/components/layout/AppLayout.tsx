import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "../ThemeToggle";
import { Outlet } from "react-router-dom";
import { Search, Bell } from "lucide-react";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="ml-16">
        {/* Top bar */}
        <header className="h-14 border-b border-border/60 flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-2 text-muted-foreground">
            {/* breadcrumb placeholder */}
          </div>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <ThemeToggle />
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
              U
            </div>
          </div>
        </header>
        <main className="px-6 py-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
