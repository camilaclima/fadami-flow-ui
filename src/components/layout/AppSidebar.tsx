import { LayoutDashboard, ListTodo, Package, Users, Settings, ChevronLeft, Briefcase, Shield, UserCog } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useAdminStore } from "@/store/adminStore";
import type { SystemPage } from "@/types/admin";

const NAV_ITEMS: { title: string; url: string; icon: typeof LayoutDashboard; permission: SystemPage }[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, permission: "dashboard" },
  { title: "Backlogs", url: "/backlogs", icon: ListTodo, permission: "backlogs" },
  { title: "Produtos", url: "/products", icon: Package, permission: "products" },
  { title: "Clientes", url: "/clients", icon: Users, permission: "clients" },
  { title: "Usuários", url: "/users", icon: UserCog, permission: "users" },
  { title: "Cargos", url: "/roles", icon: Briefcase, permission: "roles" },
  { title: "Grupos", url: "/groups", icon: Shield, permission: "groups" },
  { title: "Configurações", url: "/settings", icon: Settings, permission: "settings" },
];

export function AppSidebar() {
  const [expanded, setExpanded] = useState(false);
  const permissions = useAdminStore((s) => s.getCurrentUserPermissions());

  const visibleItems = NAV_ITEMS.filter((item) => permissions.includes(item.permission));

  return (
    <motion.aside
      className="fixed left-0 top-0 h-full z-40 flex flex-col bg-card border-r border-border/60"
      style={{ boxShadow: expanded ? "var(--shadow-elevated)" : "none" }}
      initial={false}
      animate={{ width: expanded ? 240 : 64 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-border/60 gap-3 overflow-hidden">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-bold text-sm">F</span>
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="font-semibold text-foreground whitespace-nowrap text-sm"
            >
              FadamiFlow
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/"}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all duration-150 group"
            activeClassName="bg-primary/10 text-primary"
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <AnimatePresence>
              {expanded && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.12 }}
                  className="text-sm font-medium whitespace-nowrap"
                >
                  {item.title}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>

      {/* Collapse indicator */}
      <div className="p-3 border-t border-border/60 flex justify-center">
        <motion.div animate={{ rotate: expanded ? 0 : 180 }} transition={{ duration: 0.2 }}>
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </div>
    </motion.aside>
  );
}
