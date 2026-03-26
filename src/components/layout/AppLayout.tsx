import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "../ThemeToggle";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="ml-16">
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center justify-end px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <ThemeToggle />
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
