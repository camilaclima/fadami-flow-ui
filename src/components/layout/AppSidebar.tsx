import React, { useState } from "react";
import { ChevronDown, ChevronRight, LayoutDashboard, ShieldCheck, ListTodo } from "lucide-react";

// Exemplo de componente Sidebar ajustado
const Sidebar = ({ isCollapsed }) => {
  // Estado para controlar os menus pais vindo fechados por padrão
  const [openMenus, setOpenMenus] = useState({});

  const toggleMenu = (menuName) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  return (
    <aside
      className={`h-screen bg-white border-r border-gray-200 transition-all duration-300 ${isCollapsed ? "w-24" : "w-72"}`}
    >
      {/* HEADER DA SIDEBAR - CENTRALIZAÇÃO AJUSTADA */}
      <div className="p-6 flex items-center gap-3 min-h-[80px]">
        {/* Ícone de Fluxo (Referência image_25) */}
        <div className="flex-shrink-0 text-gray-400">
          {/* Substitua pelo seu SVG de Matriz/Fluxo se necessário */}
          <svg
            width="24"
            height="24"
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

      {/* NAVEGAÇÃO */}
      <nav className="px-4 py-2 space-y-6">
        {/* GRUPO BACKLOG */}
        <div>
          <button
            onClick={() => toggleMenu("backlog")}
            className="w-full flex items-center justify-between p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <ListTodo size={20} />
              {!isCollapsed && <span className="font-semibold text-sm capitalize text-gray-500">Backlog</span>}
            </div>
            {!isCollapsed && (openMenus["backlog"] ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
          </button>

          {!isCollapsed && openMenus["backlog"] && (
            <div className="ml-9 mt-2 space-y-1">
              <a href="#" className="block p-2 text-sm text-gray-600 hover:text-purple-600">
                Dashboard
              </a>
              <a href="#" className="block p-2 text-sm text-gray-600 hover:text-purple-600">
                Backlogs
              </a>
            </div>
          )}
        </div>

        {/* GRUPO CADASTROS E PERMISSÕES */}
        <div>
          <button
            onClick={() => toggleMenu("cadastros")}
            className="w-full flex items-center justify-between p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} />
              {!isCollapsed && (
                <span className="font-semibold text-sm capitalize text-gray-500">Cadastros e Permissões</span>
              )}
            </div>
            {!isCollapsed && (openMenus["cadastros"] ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
          </button>

          {!isCollapsed && openMenus["cadastros"] && (
            <div className="ml-9 mt-2 space-y-1">
              <a href="#" className="block p-2 text-sm text-gray-600 hover:text-purple-600">
                Produtos
              </a>
              <a href="#" className="block p-2 text-sm text-gray-600 hover:text-purple-600">
                Clientes
              </a>
              <a href="#" className="block p-2 text-sm text-gray-600 hover:text-purple-600">
                Usuários
              </a>
              <a href="#" className="block p-2 text-sm text-gray-600 hover:text-purple-600">
                Cargos
              </a>
              <a href="#" className="block p-2 text-sm text-gray-600 hover:text-purple-600">
                Grupos
              </a>
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
