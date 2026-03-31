import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ListTodo,
  ShieldCheck,
  LayoutDashboard,
  Package,
  Users,
  UserCog,
  UserCircle,
  Briefcase,
} from "lucide-react";

interface AppSidebarProps {
  isCollapsed: boolean;
}

const AppSidebar = ({ isCollapsed }: AppSidebarProps) => {
  // CORREÇÃO: Estado inicial vazio para que todos os menus comecem fechados (retráteis)
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const toggleMenu = (menuName: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  return (
    <aside
      className={`h-screen bg-white border-r border-gray-200 transition-all duration-300 shadow-sm flex flex-col ${
        isCollapsed ? "w-24" : "w-72"
      }`}
    >
      {/* HEADER DA SIDEBAR: ÍCONE + TEXTO CENTRALIZADOS (image_57a7b0) */}
      <div className="p-6 flex items-center gap-3 min-h-[80px] border-b border-gray-50">
        {/* NOVO ÍCONE DE FLUXO (image_25) */}
        <div className="flex-shrink-0 text-gray-400 flex items-center justify-center">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8-8-3.6-8-8Z" />
            <path d="M12 12h.01" />
            <path d="M16 12h.01" />
            <path d="M8 12h.01" />
          </svg>
        </div>

        {!isCollapsed && (
          <div className="flex flex-col overflow-hidden">
            <h1 className="text-xl font-bold flex items-center gap-1 whitespace-nowrap">
              <span className="text-gray-600">Fadami</span>
              <span className="text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)] animate-pulse">Flow</span>
            </h1>
          </div>
        )}
      </div>

      {/* NAVEGAÇÃO - SCROLLÁVEL SE NECESSÁRIO */}
      <nav className="flex-1 px-4 py-6 space-y-4 overflow-y-auto">
        {/* GRUPO 1: BACKLOG */}
        <div>
          <button
            onClick={() => toggleMenu("backlog")}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
              openMenus["backlog"] ? "bg-orange-50 text-orange-600" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <ListTodo size={22} className={openMenus["backlog"] ? "text-orange-500" : "text-gray-400"} />
              {/* CORREÇÃO: Texto sem uppercase e sem corte */}
              {!isCollapsed && <span className="font-semibold text-[15px] whitespace-nowrap">Backlog</span>}
            </div>
            {!isCollapsed && (
              <div className="transition-transform duration-200">
                {openMenus["backlog"] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </div>
            )}
          </button>

          {!isCollapsed && openMenus["backlog"] && (
            <div className="ml-10 mt-2 space-y-1 animate-in fade-in slide-in-from-top-1">
              <a
                href="/dashboard"
                className="flex items-center gap-2 p-2 text-sm text-gray-600 hover:text-orange-500 rounded-md"
              >
                <LayoutDashboard size={16} /> Dashboard
              </a>
              <a
                href="/backlogs"
                className="flex items-center gap-2 p-2 text-sm text-gray-600 hover:text-orange-500 rounded-md"
              >
                <Package size={16} /> Backlogs
              </a>
            </div>
          )}
        </div>

        {/* GRUPO 2: CADASTROS E PERMISSÕES */}
        <div>
          <button
            onClick={() => toggleMenu("cadastros")}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
              openMenus["cadastros"] ? "bg-orange-50 text-orange-600" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck size={22} className={openMenus["cadastros"] ? "text-orange-500" : "text-gray-400"} />
              {/* CORREÇÃO: Texto sem uppercase e sem corte */}
              {!isCollapsed && (
                <span className="font-semibold text-[15px] whitespace-nowrap">Cadastros e Permissões</span>
              )}
            </div>
            {!isCollapsed && (
              <div className="transition-transform duration-200">
                {openMenus["cadastros"] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </div>
            )}
          </button>

          {!isCollapsed && openMenus["cadastros"] && (
            <div className="ml-10 mt-2 space-y-1 animate-in fade-in slide-in-from-top-1">
              <a
                href="/produtos"
                className="flex items-center gap-2 p-2 text-sm text-gray-600 hover:text-orange-500 rounded-md"
              >
                <Package size={16} /> Produtos
              </a>
              <a
                href="/clientes"
                className="flex items-center gap-2 p-2 text-sm text-gray-600 hover:text-orange-500 rounded-md"
              >
                <Briefcase size={16} /> Clientes
              </a>
              <a
                href="/usuarios"
                className="flex items-center gap-2 p-2 text-sm text-gray-600 hover:text-orange-500 rounded-md"
              >
                <Users size={16} /> Usuários
              </a>
              <a
                href="/cargos"
                className="flex items-center gap-2 p-2 text-sm text-gray-600 hover:text-orange-500 rounded-md"
              >
                <UserCog size={16} /> Cargos
              </a>
              <a
                href="/grupos"
                className="flex items-center gap-2 p-2 text-sm text-gray-600 hover:text-orange-500 rounded-md"
              >
                <UserCircle size={16} /> Grupos
              </a>
            </div>
          )}
        </div>
      </nav>

      {/* FOOTER DA SIDEBAR (SLOGAN DISCRETO) */}
      {!isCollapsed && (
        <div className="p-6 border-t border-gray-50">
          <p className="text-[10px] leading-tight text-gray-400 font-medium italic">
            Inteligência e Governança em Todo o Fluxo Ágil
          </p>
        </div>
      )}
    </aside>
  );
};

export default AppSidebar;
