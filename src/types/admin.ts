export type ProductStatus = "active" | "inactive";

export interface AdminProduct {
  id: string;
  name: string;
  description: string;
  status: ProductStatus;
  color: string;
}

export interface Role {
  id: string;
  title: string;
}

export const SYSTEM_PAGES = [
  "dashboard",
  "backlogs",
  "team",
  "sprints",
  "project_context",
  "daily",
  "team_project_config",
  "controle_gestao",
  "minha_daily",
  "painel_gp",
  "squads",
  "products",
  "clients",
  "users",
  "roles",
  "groups",
  "settings",
] as const;

export type SystemPage = (typeof SYSTEM_PAGES)[number];

export const SYSTEM_PAGE_LABELS: Record<SystemPage, string> = {
  dashboard: "Dashboard",
  backlogs: "Backlogs",
  team: "Equipe",
  sprints: "Sprints",
  project_context: "Configuração e Backlog",
  daily: "Saúde do Projeto",
  team_project_config: "Configuração Time/Projeto",
  controle_gestao: "Controle e Gestão",
  minha_daily: "Minha Daily",
  painel_gp: "Painel do GP",
  squads: "Squads",
  products: "Produtos",
  clients: "Clientes",
  users: "Usuários",
  roles: "Cargos",
  groups: "Grupos de Acesso",
  settings: "Configurações",
};

export interface AccessGroup {
  id: string;
  name: string;
  permissions: SystemPage[];
}

export interface AppUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  productId: string;
  roleId: string;
  groupId: string;
  active: boolean;
  firstAccess: boolean;
  tempPassword?: string;
  createdAt: string;
}
