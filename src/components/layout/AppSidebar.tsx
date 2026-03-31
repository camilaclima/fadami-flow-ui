import { LayoutDashboard, ListTodo, Package, Users, Settings, ChevronLeft, ChevronDown, Briefcase, Shield, UserCog, ClipboardList, ShieldCheck } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { FadamiFlowLogo } from "@/components/FadamiFlowLogo";
import menuIcon from "@/assets/menu-icon.png";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { useAdminStore } from "@/store/adminStore";
import type { SystemPage } from "@/types/admin";

interface NavItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  permission: SystemPage;
}

interface NavGroup {
  label: string;
  icon: typeof LayoutDashboard;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "BACKLOG",
    icon: ClipboardList,
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard, permission: "dashboard" },
      { title: "Backlogs", url: "/backlogs", icon: ListTodo, permission: "backlogs" },
    ],
  },
  {
    label: "CADASTROS E PERMISSÕES",
    icon: ShieldCheck,
    items: [
      { title: "Produtos", url: "/products", icon: Package, permission: "products" },
      { title: "Clientes", url: "/clients", icon: Users, permission: "clients" },
      { title: "Usuários", url: "/users", icon: UserCog, permission: "users" },
      { title: "Cargos", url: "/roles", icon: Briefcase, permission: "roles" },
      { title: "Grupos", url: "/groups", icon: Shield, permission: "groups" },
    ],
  },
  {
    label: "SISTEMA",
    icon: Settings,
    items: [
      { title: "Configurações", url: "/settings", icon: Settings, permission: "settings" },
    ],
  },
];

export function AppSidebar() {
  const [expanded, setExpanded] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.map((g) => [g.label, false]))
  );
  const currentUserId = useAdminStore((s) => s.currentUserId);
  const users = useAdminStore((s) => s.users);
  const accessGroups = useAdminStore((s) => s.accessGroups);

  const permissions = useMemo(() => {
    const user = users.find((u) => u.id === currentUserId);
    if (!user) return [] as SystemPage[];
    const group = accessGroups.find((g) => g.id === user.groupId);
    return group?.permissions ?? [];
  }, [currentUserId, users, accessGroups]);

  const visibleGroups = useMemo(() => {
    return NAV_GROUPS
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => permissions.includes(item.permission)),
      }))
      .filter((group) => group.items.length > 0);
  }, [permissions]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

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
      <div className="h-14 flex items-center justify-center px-4 border-b border-border/60 overflow-hidden">
        {expanded ? (
          <FadamiFlowLogo showIcon />
        ) : (
          <img src={menuIcon} alt="Menu" className="w-5 h-5 opacity-60 dark:invert dark:opacity-50" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto overflow-x-hidden">
        {visibleGroups.map((group, gi) => {
          const isOpen = openGroups[group.label] !== false;
          return (
            <div key={group.label} className={gi > 0 ? "mt-4" : ""}>
              {/* Group header - clickable accordion */}
              <button
                onClick={() => toggleGroup(group.label)}
                className={`w-full flex items-center gap-2.5 rounded-lg text-foreground/80 hover:text-foreground transition-colors duration-150 ${expanded ? "px-3 py-2" : "px-3 py-2 justify-center"}`}
              >
                <group.icon className="w-[18px] h-[18px] flex-shrink-0" />
                <AnimatePresence>
                  {expanded && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.12 }}
                      className="text-[13px] font-semibold tracking-wide whitespace-nowrap flex-1 text-left"
                    >
                      {group.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {expanded && (
                  <motion.div
                    animate={{ rotate: isOpen ? 0 : -90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                  </motion.div>
                )}
              </button>

              {/* Group children - collapsible */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-0.5 mt-1">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.url}
                          to={item.url}
                          end={item.url === "/"}
                          className={`flex items-center gap-3 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all duration-150 group ${expanded ? "px-4" : "px-3"}`}
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
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
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