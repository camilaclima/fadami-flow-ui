import { LayoutDashboard, ListTodo, Package, Users, Settings, ChevronLeft, ChevronDown, Briefcase, Shield, UserCog, ClipboardList, ShieldCheck, UsersRound, Zap, CalendarCheck, Users2, KeyRound, SlidersHorizontal, FolderKanban, MessageSquare, ClipboardEdit, Sparkles, History, Activity } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { FadamiFlowLogo } from "@/components/FadamiFlowLogo";
import menuIcon from "@/assets/menu-icon.png";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDailySim } from "@/contexts/DailySimContext";
import type { SystemPage } from "@/types/admin";

interface NavItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  permission: SystemPage | "__always__";
}

interface NavGroup {
  label: string;
  icon: typeof LayoutDashboard;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Backlog",
    icon: ClipboardList,
    items: [
      { title: "Dashboard", url: "/cockpit", icon: LayoutDashboard, permission: "dashboard" },
      { title: "Backlogs", url: "/backlogs", icon: ListTodo, permission: "backlogs" },
    ],
  },
  {
    label: "Sprints",
    icon: Zap,
    items: [
      { title: "Equipe", url: "/team", icon: UsersRound, permission: "team" },
      { title: "Sprints", url: "/sprints", icon: Zap, permission: "sprints" },
      { title: "Saúde do Projeto", url: "/daily-status", icon: CalendarCheck, permission: "daily" },
      { title: "Configuração Time/Projeto", url: "/team-project-config", icon: SlidersHorizontal, permission: "team_project_config" },
    ],
  },
  {
    label: "Gestão de Projetos",
    icon: FolderKanban,
    items: [
      { title: "Controle e Gestão", url: "/controle-gestao", icon: FolderKanban, permission: "controle_gestao" },
    ],
  },
  {
    label: "Dailys",
    icon: MessageSquare,
    items: [
      { title: "Minha Daily", url: "/dailys/registro", icon: ClipboardEdit, permission: "minha_daily" },
      { title: "Painel do GP", url: "/dailys/painel", icon: Sparkles, permission: "painel_gp" },
    ],
  },
  {
    label: "Cadastros e Permissões",
    icon: ShieldCheck,
    items: [
      { title: "Produtos", url: "/products", icon: Package, permission: "products" },
      { title: "Clientes", url: "/clients", icon: Users, permission: "clients" },
      { title: "Squads", url: "/squads", icon: Users2, permission: "squads" },
      { title: "Usuários", url: "/users", icon: UserCog, permission: "users" },
      { title: "Cargos", url: "/roles", icon: Briefcase, permission: "roles" },
      { title: "Grupos", url: "/groups", icon: Shield, permission: "groups" },
    ],
  },
  {
    label: "Sistema",
    icon: Settings,
    items: [
      { title: "Alterar Senha", url: "/change-password", icon: KeyRound, permission: "__always__" },
      { title: "Configurações", url: "/settings", icon: Settings, permission: "settings" },
    ],
  },
];

export function AppSidebar() {
  const [expanded, setExpanded] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.map((g) => [g.label, false]))
  );
  const { permissions } = useAuth();
  const { current: sim } = useDailySim();

  const visibleGroups = useMemo(() => {
    return NAV_GROUPS
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) => item.permission === "__always__" || permissions.includes(item.permission as SystemPage)
        ),
      }))
      .map((group) => {
        // Aplica isolamento do simulador de Dailys.
        if (group.label === "Dailys") {
          const roles = sim.roles ?? [sim.role];
          if (roles.includes("diretor")) return group;
          let items = group.items.filter((i) => {
            if (i.url === "/dailys/registro") return roles.includes("dev");
            if (i.url === "/dailys/painel") return roles.includes("gp");
            // demais itens (histórico, saúde) exigem gp/diretor
            return roles.includes("gp");
          });
          return { ...group, items };
        }
        // Cadastros e Permissões só para Diretor/Admin.
        if (group.label === "Cadastros e Permissões" && sim.role !== "diretor") {
          return { ...group, items: [] };
        }
        // Sistema -> mantém "Alterar Senha" para todos, "Configurações" só para diretor
        if (group.label === "Sistema" && sim.role !== "diretor") {
          return { ...group, items: group.items.filter((i) => i.url !== "/settings") };
        }
        return group;
      })
      .filter((group) => group.items.length > 0);
  }, [permissions, sim.role, sim.roles]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <motion.aside
      className="fixed left-0 top-0 h-full z-40 flex flex-col bg-card border-r border-border/60"
      style={{ boxShadow: expanded ? "var(--shadow-elevated)" : "none" }}
      initial={false}
      animate={{ width: expanded ? 280 : 64 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="h-14 flex items-center justify-center px-4 border-b border-border/60 overflow-hidden">
        {expanded ? (
          <FadamiFlowLogo showIcon />
        ) : (
          <img src={menuIcon} alt="Menu" className="w-5 h-5 opacity-60 dark:invert dark:opacity-50" />
        )}
      </div>

      <nav className="flex-1 py-3 px-2 overflow-y-auto overflow-x-hidden">
        {visibleGroups.map((group, gi) => {
          const isOpen = openGroups[group.label] !== false;
          return (
            <div key={group.label} className={gi > 0 ? "mt-4" : ""}>
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

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-0.5 mt-0.5">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.url}
                          to={item.url}
                          end={item.url === "/"}
                          className={`flex items-center gap-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all duration-150 group ${expanded ? "pl-8 pr-3" : "px-3"}`}
                          activeClassName="bg-primary/10 text-primary"
                        >
                          <item.icon className="w-4 h-4 flex-shrink-0" />
                          <AnimatePresence>
                            {expanded && (
                              <motion.span
                                initial={{ opacity: 0, x: -4 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -4 }}
                                transition={{ duration: 0.12 }}
                                className="text-[13px] font-normal whitespace-nowrap"
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

      <div className="p-3 border-t border-border/60 flex justify-center">
        <motion.div animate={{ rotate: expanded ? 0 : 180 }} transition={{ duration: 0.2 }}>
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </div>
    </motion.aside>
  );
}
