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
