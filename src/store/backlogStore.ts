import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import type {
  BacklogItem,
  Product,
  Client,
  Phase,
  PrioritizationData,
  ApprovalData,
  RefinementData,
  Priority,
  SubItem,
} from "@/types/backlog";

function calculatePriority(bv: number, oc: number, est: number): Priority {
  const score = (bv + oc) / 2 - est / 20;
  if (score >= 3.5) return "high";
  if (score >= 2) return "medium";
  return "low";
}

function mapBacklog(row: any, phaseHistory: any[] = [], profilesMap: Record<string, string> = {}): BacklogItem {
  const resolveUser = (uid: string) => (uid ? (profilesMap[uid] ?? "Usuário") : "—");
  const mapPhaseData = (data: any) =>
    data
      ? {
          ...data,
          updatedBy: resolveUser(data.updated_by || data.updatedBy),
          updatedAt: data.updated_at || data.updatedAt,
        }
      : undefined;

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    attachment: row.attachment,
    type: row.type ?? "functional",
    productId: row.product_id ?? "",
    clientId: row.client_id ?? undefined,
    thermometer: row.thermometer ?? "medium",
    phase: row.phase as Phase,
    createdBy: resolveUser(row.created_by),
    createdAt: row.created_at,
    phaseHistory: phaseHistory.map((h: any) => ({
      phase: h.phase as Phase,
      enteredAt: h.entered_at,
      completedAt: h.completed_at ?? undefined,
    })),
    prioritization: mapPhaseData(row.prioritization),
    approval: mapPhaseData(row.approval),
    refinement: mapPhaseData(row.refinement),
  };
}

interface BacklogStore {
  backlogs: BacklogItem[];
  products: Product[];
  clients: Client[];
  loading: boolean;
  initialized: boolean;
  fetchAll: () => Promise<void>;
  updateBacklog: (id: string, updates: Partial<BacklogItem>) => Promise<void>;
  saveApproval: (id: string, data: ApprovalData) => Promise<void>;
  completeRefinement: (backlogId: string, type: "functional" | "technical") => Promise<void>;
  saveRefinement: (id: string, data: RefinementData) => Promise<void>;
}

export const useBacklogStore = create<BacklogStore>((set, get) => ({
  backlogs: [],
  products: [],
  clients: [],
  loading: false,
  initialized: false,

  fetchAll: async () => {
    set({ loading: true });
    try {
      const [backlogsRes, historyRes, productsRes, clientsRes, profilesRes] = await Promise.all([
        supabase.from("backlogs").select("*").order("created_at", { ascending: false }),
        supabase.from("backlog_phase_history").select("*").order("entered_at"),
        supabase.from("products").select("*").eq("status", "active"),
        supabase.from("clients").select("*"),
        supabase.from("profiles").select("user_id, first_name, last_name"),
      ]);

      const profilesMap: Record<string, string> = {};
      profilesRes.data?.forEach((p) => (profilesMap[p.user_id] = `${p.first_name} ${p.last_name}`));

      const historyByBacklog: Record<string, any[]> = {};
      historyRes.data?.forEach((h) => {
        if (!historyByBacklog[h.backlog_id]) historyByBacklog[h.backlog_id] = [];
        historyByBacklog[h.backlog_id].push(h);
      });

      const backlogs = (backlogsRes.data ?? []).map((row) => mapBacklog(row, historyByBacklog[row.id], profilesMap));
      set({ backlogs, initialized: true, loading: false });
    } catch (err) {
      set({ loading: false });
    }
  },

  updateBacklog: async (id, updates) => {
    await supabase
      .from("backlogs")
      .update(updates as any)
      .eq("id", id);
    get().fetchAll();
  },

  saveApproval: async (id, data) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const now = new Date().toISOString();

    await supabase
      .from("backlogs")
      .update({
        phase: "functional_refinement",
        approval: { ...data, updated_by: user?.id, updated_at: now } as any,
      })
      .eq("id", id);

    await supabase
      .from("backlog_phase_history")
      .update({ completed_at: now })
      .eq("backlog_id", id)
      .eq("phase", "approval")
      .is("completed_at", null);

    await supabase.from("backlog_phase_history").insert({
      backlog_id: id,
      phase: "functional_refinement",
      entered_at: now,
    });
    get().fetchAll();
  },

  completeRefinement: async (backlogId, type) => {
    const now = new Date().toISOString();
    const currentPhase = type === "functional" ? "functional_refinement" : "technical_refinement";
    const nextPhase = type === "functional" ? "technical_refinement" : "available";

    await supabase.from("backlogs").update({ phase: nextPhase }).eq("id", backlogId);
    await supabase
      .from("backlog_phase_history")
      .update({ completed_at: now })
      .eq("backlog_id", backlogId)
      .eq("phase", currentPhase)
      .is("completed_at", null);

    await supabase.from("backlog_phase_history").insert({
      backlog_id: backlogId,
      phase: nextPhase,
      entered_at: now,
    });
    get().fetchAll();
  },

  saveRefinement: async (id, data) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const now = new Date().toISOString();
    await supabase
      .from("backlogs")
      .update({
        refinement: { ...data, updated_by: user?.id, updated_at: now } as any,
      })
      .eq("id", id);
    get().fetchAll();
  },
}));
