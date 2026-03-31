import { create } from "zustand";
import type { AdminProduct, Role, AccessGroup, AppUser, SystemPage } from "@/types/admin";
import { SYSTEM_PAGES } from "@/types/admin";

const MOCK_PRODUCTS: AdminProduct[] = [
  { id: "p1", name: "FadamiFlow Web", description: "Plataforma web de gestão de backlogs", status: "active", color: "hsl(243 75% 59%)" },
  { id: "p2", name: "FadamiFlow Mobile", description: "App mobile para acompanhamento", status: "active", color: "hsl(160 84% 39%)" },
  { id: "p3", name: "FadamiFlow API", description: "API REST para integrações", status: "active", color: "hsl(38 92% 50%)" },
];

const MOCK_ROLES: Role[] = [
  { id: "r1", title: "Diretor" },
  { id: "r2", title: "Analista Sênior" },
  { id: "r3", title: "Product Owner" },
  { id: "r4", title: "Desenvolvedor" },
];

const MOCK_GROUPS: AccessGroup[] = [
  { id: "g1", name: "Administradores", permissions: [...SYSTEM_PAGES] },
  { id: "g2", name: "Diretoria", permissions: ["dashboard", "backlogs", "products", "clients", "settings"] },
  { id: "g3", name: "PMO", permissions: ["dashboard", "backlogs"] },
];

const MOCK_USERS: AppUser[] = [
  { id: "u1", firstName: "Admin", lastName: "Sistema", email: "admin@fadamiflow.com", productId: "p1", roleId: "r1", groupId: "g1", active: true, firstAccess: false, createdAt: "2024-01-01T00:00:00Z" },
  { id: "u2", firstName: "Ana", lastName: "Silva", email: "ana@fadamiflow.com", productId: "p1", roleId: "r3", groupId: "g2", active: true, firstAccess: false, createdAt: "2024-02-15T00:00:00Z" },
  { id: "u3", firstName: "Carlos", lastName: "Mendes", email: "carlos@fadamiflow.com", productId: "p2", roleId: "r4", groupId: "g3", active: true, firstAccess: true, tempPassword: "abc12345", createdAt: "2024-03-01T00:00:00Z" },
];

function generatePassword(): string {
  return Math.random().toString(36).slice(-8);
}

interface AdminStore {
  products: AdminProduct[];
  roles: Role[];
  accessGroups: AccessGroup[];
  users: AppUser[];
  currentUserId: string;
  isAuthenticated: boolean;

  // Products
  addProduct: (p: Omit<AdminProduct, "id">) => void;
  updateProduct: (id: string, p: Partial<AdminProduct>) => void;
  toggleProductStatus: (id: string) => void;

  // Roles
  addRole: (title: string) => void;
  updateRole: (id: string, title: string) => void;
  deleteRole: (id: string) => void;

  // Access Groups
  addAccessGroup: (name: string, permissions: SystemPage[]) => void;
  updateAccessGroup: (id: string, name: string, permissions: SystemPage[]) => void;
  deleteAccessGroup: (id: string) => void;

  // Users
  addUser: (u: Omit<AppUser, "id" | "createdAt" | "firstAccess" | "tempPassword" | "active">) => string; // returns tempPassword
  updateUser: (id: string, u: Partial<AppUser>) => void;
  toggleUserActive: (id: string) => void;
  getCloneData: (id: string) => Partial<AppUser> | null;

  // Auth
  login: (email: string, password: string) => { success: boolean; message: string };
  logout: () => void;

  // Permissions
  getCurrentUserPermissions: () => SystemPage[];
}

export const useAdminStore = create<AdminStore>((set, get) => ({
  products: MOCK_PRODUCTS,
  roles: MOCK_ROLES,
  accessGroups: MOCK_GROUPS,
  users: MOCK_USERS,
  currentUserId: "",
  isAuthenticated: false,

  // Products
  addProduct: (p) =>
    set((s) => ({ products: [...s.products, { ...p, id: `p${Date.now()}` }] })),
  updateProduct: (id, p) =>
    set((s) => ({ products: s.products.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
  toggleProductStatus: (id) =>
    set((s) => ({
      products: s.products.map((x) =>
        x.id === id ? { ...x, status: x.status === "active" ? "inactive" : "active" } : x
      ),
    })),

  // Roles
  addRole: (title) =>
    set((s) => ({ roles: [...s.roles, { id: `r${Date.now()}`, title }] })),
  updateRole: (id, title) =>
    set((s) => ({ roles: s.roles.map((x) => (x.id === id ? { ...x, title } : x)) })),
  deleteRole: (id) =>
    set((s) => ({ roles: s.roles.filter((x) => x.id !== id) })),

  // Access Groups
  addAccessGroup: (name, permissions) =>
    set((s) => ({ accessGroups: [...s.accessGroups, { id: `g${Date.now()}`, name, permissions }] })),
  updateAccessGroup: (id, name, permissions) =>
    set((s) => ({
      accessGroups: s.accessGroups.map((x) => (x.id === id ? { ...x, name, permissions } : x)),
    })),
  deleteAccessGroup: (id) =>
    set((s) => ({ accessGroups: s.accessGroups.filter((x) => x.id !== id) })),

  // Users
  addUser: (u) => {
    const pwd = generatePassword();
    set((s) => ({
      users: [
        ...s.users,
        { ...u, id: `u${Date.now()}`, active: true, firstAccess: true, tempPassword: pwd, createdAt: new Date().toISOString() },
      ],
    }));
    return pwd;
  },
  updateUser: (id, u) =>
    set((s) => ({ users: s.users.map((x) => (x.id === id ? { ...x, ...u } : x)) })),
  toggleUserActive: (id) =>
    set((s) => ({
      users: s.users.map((x) => (x.id === id ? { ...x, active: !x.active } : x)),
    })),
  getCloneData: (id) => {
    const user = get().users.find((u) => u.id === id);
    if (!user) return null;
    return { productId: user.productId, roleId: user.roleId, groupId: user.groupId };
  },

  // Permissions
  getCurrentUserPermissions: () => {
    const state = get();
    const user = state.users.find((u) => u.id === state.currentUserId);
    if (!user) return [];
    const group = state.accessGroups.find((g) => g.id === user.groupId);
    return group?.permissions ?? [];
  },
}));
