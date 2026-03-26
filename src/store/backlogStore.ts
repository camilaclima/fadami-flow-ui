import { create } from "zustand";
import type {
  BacklogItem,
  Product,
  Client,
  Phase,
  PrioritizationData,
  ApprovalData,
  RefinementData,
  Priority,
  Thermometer,
} from "@/types/backlog";

function calculatePriority(bv: number, oc: number, est: number): Priority {
  const score = (bv + oc) / 2 - est / 20;
  if (score >= 3.5) return "high";
  if (score >= 2) return "medium";
  return "low";
}

const MOCK_PRODUCTS: Product[] = [
  { id: "p1", name: "FadamiFlow Web", color: "hsl(243 75% 59%)" },
  { id: "p2", name: "FadamiFlow Mobile", color: "hsl(160 84% 39%)" },
  { id: "p3", name: "FadamiFlow API", color: "hsl(38 92% 50%)" },
];

const MOCK_CLIENTS: Client[] = [
  { id: "c1", name: "TechCorp", email: "contato@techcorp.com" },
  { id: "c2", name: "StartupXYZ", email: "hello@startupxyz.com" },
  { id: "c3", name: "MegaSoft", email: "info@megasoft.com" },
];

const now = new Date().toISOString();

const MOCK_BACKLOGS: BacklogItem[] = [
  {
    id: "b1",
    title: "Implementar autenticação OAuth2",
    description: "Adicionar suporte a login com Google e GitHub para simplificar o onboarding dos usuários.",
    productId: "p1",
    clientId: "c1",
    thermometer: "high",
    phase: "refinement",
    createdBy: "Ana Silva",
    createdAt: "2024-03-10T10:00:00Z",
    phaseHistory: [
      { phase: "backlog", enteredAt: "2024-03-10T10:00:00Z", completedAt: "2024-03-12T14:00:00Z" },
      { phase: "prioritization", enteredAt: "2024-03-12T14:00:00Z", completedAt: "2024-03-14T09:00:00Z" },
      { phase: "approval", enteredAt: "2024-03-14T09:00:00Z", completedAt: "2024-03-15T11:00:00Z" },
      { phase: "refinement", enteredAt: "2024-03-15T11:00:00Z" },
    ],
    prioritization: { businessValue: 5, opportunityCost: 4, estimate: 16, priority: "high" },
    approval: { observation: "Aprovado. Essencial para o lançamento." },
  },
  {
    id: "b2",
    title: "Redesign da página de dashboard",
    description: "Atualizar o layout do dashboard com novos gráficos e métricas de performance.",
    productId: "p1",
    thermometer: "medium",
    phase: "prioritization",
    createdBy: "Carlos Mendes",
    createdAt: "2024-03-15T08:30:00Z",
    phaseHistory: [
      { phase: "backlog", enteredAt: "2024-03-15T08:30:00Z", completedAt: "2024-03-17T10:00:00Z" },
      { phase: "prioritization", enteredAt: "2024-03-17T10:00:00Z" },
    ],
  },
  {
    id: "b3",
    title: "API de exportação de relatórios",
    description: "Criar endpoints para exportação de dados em CSV e PDF.",
    productId: "p3",
    clientId: "c2",
    thermometer: "low",
    phase: "backlog",
    createdBy: "Marina Costa",
    createdAt: now,
    phaseHistory: [{ phase: "backlog", enteredAt: now }],
  },
  {
    id: "b4",
    title: "Notificações push mobile",
    description: "Sistema de notificações em tempo real para o app mobile com suporte a deep linking.",
    productId: "p2",
    thermometer: "high",
    phase: "approval",
    createdBy: "Pedro Alves",
    createdAt: "2024-03-08T14:00:00Z",
    phaseHistory: [
      { phase: "backlog", enteredAt: "2024-03-08T14:00:00Z", completedAt: "2024-03-09T10:00:00Z" },
      { phase: "prioritization", enteredAt: "2024-03-09T10:00:00Z", completedAt: "2024-03-11T16:00:00Z" },
      { phase: "approval", enteredAt: "2024-03-11T16:00:00Z" },
    ],
    prioritization: { businessValue: 4, opportunityCost: 3, estimate: 24, priority: "medium" },
  },
  {
    id: "b5",
    title: "Integração com Slack",
    description: "Enviar atualizações de backlog automaticamente para canais do Slack.",
    productId: "p1",
    clientId: "c3",
    thermometer: "medium",
    phase: "backlog",
    createdBy: "Ana Silva",
    createdAt: "2024-03-20T09:00:00Z",
    phaseHistory: [{ phase: "backlog", enteredAt: "2024-03-20T09:00:00Z" }],
  },
  {
    id: "b6",
    title: "Modo offline para mobile",
    description: "Permitir que usuários acessem e editem backlogs sem conexão à internet.",
    productId: "p2",
    clientId: "c1",
    thermometer: "low",
    phase: "finished",
    createdBy: "Carlos Mendes",
    createdAt: "2024-02-01T10:00:00Z",
    phaseHistory: [
      { phase: "backlog", enteredAt: "2024-02-01T10:00:00Z", completedAt: "2024-02-03T10:00:00Z" },
      { phase: "prioritization", enteredAt: "2024-02-03T10:00:00Z", completedAt: "2024-02-05T10:00:00Z" },
      { phase: "approval", enteredAt: "2024-02-05T10:00:00Z", completedAt: "2024-02-06T10:00:00Z" },
      { phase: "refinement", enteredAt: "2024-02-06T10:00:00Z", completedAt: "2024-02-10T10:00:00Z" },
      { phase: "available", enteredAt: "2024-02-10T10:00:00Z", completedAt: "2024-02-12T10:00:00Z" },
      { phase: "planned", enteredAt: "2024-02-12T10:00:00Z", completedAt: "2024-02-20T10:00:00Z" },
      { phase: "finished", enteredAt: "2024-02-20T10:00:00Z" },
    ],
    prioritization: { businessValue: 3, opportunityCost: 2, estimate: 40, priority: "low" },
    approval: { observation: "Aprovado com ressalvas sobre performance." },
    refinement: {
      functionalRefinement: "Sincronizar ao reconectar",
      technicalRefinement: "IndexedDB + service worker",
      acceptanceCriteria: "Funcionar offline por até 72h",
      definitionOfDone: "Testes E2E passando, docs atualizados",
      estimate: 40,
    },
  },
];

interface BacklogStore {
  backlogs: BacklogItem[];
  products: Product[];
  clients: Client[];
  addBacklog: (item: Omit<BacklogItem, "id" | "createdAt" | "phaseHistory" | "phase">) => void;
  updateBacklog: (id: string, updates: Partial<BacklogItem>) => void;
  moveToPhase: (id: string, phase: Phase) => void;
  savePrioritization: (id: string, data: Omit<PrioritizationData, "priority">) => void;
  saveApproval: (id: string, data: ApprovalData) => void;
  saveRefinement: (id: string, data: RefinementData) => void;
}

export const useBacklogStore = create<BacklogStore>((set) => ({
  backlogs: MOCK_BACKLOGS,
  products: MOCK_PRODUCTS,
  clients: MOCK_CLIENTS,

  addBacklog: (item) =>
    set((state) => ({
      backlogs: [
        ...state.backlogs,
        {
          ...item,
          id: `b${Date.now()}`,
          phase: "backlog" as Phase,
          createdAt: new Date().toISOString(),
          phaseHistory: [{ phase: "backlog" as Phase, enteredAt: new Date().toISOString() }],
        },
      ],
    })),

  updateBacklog: (id, updates) =>
    set((state) => ({
      backlogs: state.backlogs.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),

  moveToPhase: (id, phase) =>
    set((state) => ({
      backlogs: state.backlogs.map((b) => {
        if (b.id !== id) return b;
        const now = new Date().toISOString();
        const history = b.phaseHistory.map((h) =>
          h.phase === b.phase && !h.completedAt ? { ...h, completedAt: now } : h
        );
        history.push({ phase, enteredAt: now });
        return { ...b, phase, phaseHistory: history };
      }),
    })),

  savePrioritization: (id, data) =>
    set((state) => ({
      backlogs: state.backlogs.map((b) => {
        if (b.id !== id) return b;
        const priority = calculatePriority(data.businessValue, data.opportunityCost, data.estimate);
        const now = new Date().toISOString();
        const history = b.phaseHistory.map((h) =>
          h.phase === "prioritization" && !h.completedAt ? { ...h, completedAt: now } : h
        );
        history.push({ phase: "approval" as Phase, enteredAt: now });
        return {
          ...b,
          phase: "approval" as Phase,
          prioritization: { ...data, priority },
          phaseHistory: history,
        };
      }),
    })),

  saveApproval: (id, data) =>
    set((state) => ({
      backlogs: state.backlogs.map((b) => {
        if (b.id !== id) return b;
        const now = new Date().toISOString();
        const history = b.phaseHistory.map((h) =>
          h.phase === "approval" && !h.completedAt ? { ...h, completedAt: now } : h
        );
        history.push({ phase: "refinement" as Phase, enteredAt: now });
        return { ...b, phase: "refinement" as Phase, approval: data, phaseHistory: history };
      }),
    })),

  saveRefinement: (id, data) =>
    set((state) => ({
      backlogs: state.backlogs.map((b) => {
        if (b.id !== id) return b;
        const now = new Date().toISOString();
        const history = b.phaseHistory.map((h) =>
          h.phase === "refinement" && !h.completedAt ? { ...h, completedAt: now } : h
        );
        history.push({ phase: "available" as Phase, enteredAt: now });
        return { ...b, phase: "available" as Phase, refinement: data, phaseHistory: history };
      }),
    })),
}));
