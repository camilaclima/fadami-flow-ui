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
  PhaseHistory,
} from "@/types/backlog";

function calculatePriority(bv: number, oc: number, est: number): Priority {
  const score = (bv + oc) / 2 - est / 20;
  if (score >= 3.5) return "high";
  if (score >= 2) return "medium";
  return "low";
}

// Map DB row to frontend type
function mapBacklog(row: any, phaseHistory: any[] = [], profilesMap: Record<string, string> = {}): BacklogItem {
  const resolveUser = (uid: string | null | undefined) => {
    if (!uid) return "—";
    return profilesMap[uid] ?? "Usuário desconhecido";
  };

  const mapPhaseData = (data: any) => {
    if (!data) return undefined;
    return {
      ...data,
      updatedBy: resolveUser(data.updated_by || data.updatedBy),
      updatedAt: data.updated_at || data.updatedAt,
    };
  };

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    attachment: row.attachment,
    type: row.type ?? "functional",
    productId: row.product_id ?? "",
    clientId: row.client_id ?? undefined,
    thermometer: row.thermometer ?? "medium",
    phase: row.phase ?? "prioritization",
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
  addBacklog: (item: Omit<BacklogItem, "id" | "createdAt" | "phaseHistory" | "phase">) => void;
  updateBacklog: (id: string, updates: Partial<BacklogItem>) => void;
  moveToPhase: (id: string, phase: Phase) => void;
  savePrioritization: (id: string, data: Omit<PrioritizationData, "priority">) => void;
  saveApproval: (id: string, data: ApprovalData) => void;
  saveRefinement: (id: string, data: RefinementData) => void;
  addSubItem: (backlogId: string, data: Omit<SubItem, "id" | "order">) => void;
  updateSubItem: (backlogId: string, subItemId: string, data: Omit<SubItem, "id" | "order">) => void;
  deleteSubItem: (backlogId: string, subItemId: string) => void;
  reorderSubItems: (backlogId: string, orderedIds: string[]) => void;
  completeRefinement: (backlogId: string) => void;
}

export const useBacklogStore = create<BacklogStore>((set, get) => ({
  backlogs: [],
  products: [],
  clients: [],
  loading: false,
  initialized: false,

  fetchAll: async () => {
    if (get().loading) return;
    set({ loading: true });

    try {
      const [backlogsRes, historyRes, productsRes, clientsRes, profilesRes] = await Promise.all([
        supabase.from("backlogs").select("*").order("created_at", { ascending: false }),
        supabase.from("backlog_phase_history").select("*").order("entered_at"),
        supabase.from("products").select("*").eq("status", "active").order("name"),
        // AJUSTE: Cast "any" para ignorar erro de tipagem no filtro de status
        supabase.from("clients").select("*").eq("active", true).order("name"),
        supabase.from("profiles").select("user_id, first_name, last_name"),
      ]);

      const profilesMap: Record<string, string> = {};
      (profilesRes.data ?? []).forEach((p: any) => {
        const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
        if (name) profilesMap[p.user_id] = name;
      });

      const historyByBacklog: Record<string, any[]> = {};
      (historyRes.data ?? []).forEach((h: any) => {
        if (!historyByBacklog[h.backlog_id]) historyByBacklog[h.backlog_id] = [];
        historyByBacklog[h.backlog_id].push(h);
      });

      const backlogs = (backlogsRes.data ?? []).map((row: any) =>
        mapBacklog(row, historyByBacklog[row.id] ?? [], profilesMap),
      );

      const products = (productsRes.data ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        color: p.color,
      }));

      const clients = (clientsRes.data ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        email: c.email,
      }));

      set({ backlogs, products, clients, loading: false, initialized: true });
    } catch (err) {
      console.error("Failed to fetch backlogs:", err);
      set({ loading: false, initialized: true });
    }
  },

  addBacklog: async (item) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const { data, error } = await supabase
      .from("backlogs")
      .insert({
        title: item.title,
        description: item.description,
        type: item.type,
        product_id: item.productId || null,
        client_id: item.clientId || null,
        thermometer: item.thermometer,
        phase: "prioritization",
        created_by: userId || null,
        attachment: item.attachment || null,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("Error adding backlog:", error);
      return;
    }

    await supabase.from("backlog_phase_history").insert({
      backlog_id: data.id,
      phase: "prioritization",
      entered_at: data.created_at,
    });

    get().fetchAll();
  },

  updateBacklog: async (id, updates) => {
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;

    await supabase.from("backlogs").update(dbUpdates).eq("id", id);
    get().fetchAll();
  },

  moveToPhase: async (id, phase) => {
    const item = get().backlogs.find((b) => b.id === id);
    if (!item) return;
    const now = new Date().toISOString();

    await supabase.from("backlogs").update({ phase }).eq("id", id);
    await supabase
      .from("backlog_phase_history")
      .update({ completed_at: now })
      .eq("backlog_id", id)
      .eq("phase", item.phase)
      .is("completed_at", null);
    await supabase.from("backlog_phase_history").insert({
      backlog_id: id,
      phase,
      entered_at: now,
    });

    get().fetchAll();
  },

  savePrioritization: async (id, data) => {
    const { data: userData } = await supabase.auth.getUser();
    const priority = calculatePriority(data.businessValue, data.opportunityCost, data.estimate);
    const now = new Date().toISOString();

    const prioritizationUpdate = {
      ...data,
      priority,
      updated_by: userData.user?.id,
      updated_at: now,
    } as any;

    await supabase
      .from("backlogs")
      .update({
        phase: "approval",
        prioritization: prioritizationUpdate,
      })
      .eq("id", id);

    await supabase
      .from("backlog_phase_history")
      .update({ completed_at: now })
      .eq("backlog_id", id)
      .eq("phase", "prioritization")
      .is("completed_at", null);
    await supabase.from("backlog_phase_history").insert({
      backlog_id: id,
      phase: "approval",
      entered_at: now,
    });

    get().fetchAll();
  },

  saveApproval: async (id, data) => {
    const { data: userData } = await supabase.auth.getUser();
    const now = new Date().toISOString();

    const approvalUpdate = {
      ...data,
      updated_by: userData.user?.id,
      updated_at: now,
    } as any;

    await supabase
      .from("backlogs")
      .update({
        phase: "refinement",
        approval: approvalUpdate,
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
      phase: "refinement",
      entered_at: now,
    });

    get().fetchAll();
  },

  saveRefinement: async (id, data) => {
    const { data: userData } = await supabase.auth.getUser();
    const now = new Date().toISOString();

    const refinementUpdate = {
      ...data,
      updated_by: userData.user?.id,
      updated_at: now,
    } as any;

    await supabase
      .from("backlogs")
      .update({
        phase: "available",
        refinement: refinementUpdate,
      })
      .eq("id", id);

    await supabase
      .from("backlog_phase_history")
      .update({ completed_at: now })
      .eq("backlog_id", id)
      .eq("phase", "refinement")
      .is("completed_at", null);
    await supabase.from("backlog_phase_history").insert({
      backlog_id: id,
      phase: "available",
      entered_at: now,
    });

    get().fetchAll();
  },

  addSubItem: async (backlogId, data) => {
    const { data: existing } = await supabase
      .from("backlog_sub_items")
      .select("sort_order")
      .eq("backlog_id", backlogId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

    await supabase.from("backlog_sub_items").insert({
      backlog_id: backlogId,
      title: data.title,
      functional_detail: data.functionalDetail,
      technical_detail: data.technicalDetail,
      estimate: data.estimate,
      attachment: data.attachment || null,
      sort_order: nextOrder,
    });

    await refreshSubItems(backlogId);
    get().fetchAll();
  },

  updateSubItem: async (backlogId, subItemId, data) => {
    await supabase
      .from("backlog_sub_items")
      .update({
        title: data.title,
        functional_detail: data.functionalDetail,
        technical_detail: data.technicalDetail,
        estimate: data.estimate,
        attachment: data.attachment || null,
      })
      .eq("id", subItemId);

    await refreshSubItems(backlogId);
    get().fetchAll();
  },

  deleteSubItem: async (backlogId, subItemId) => {
    await supabase.from("backlog_sub_items").delete().eq("id", subItemId);
    await refreshSubItems(backlogId);
    get().fetchAll();
  },

  reorderSubItems: async (backlogId, orderedIds) => {
    await Promise.all(
      orderedIds.map((id, i) => supabase.from("backlog_sub_items").update({ sort_order: i }).eq("id", id)),
    );
    await refreshSubItems(backlogId);
    get().fetchAll();
  },

  completeRefinement: async (backlogId) => {
    const now = new Date().toISOString();
    await supabase.from("backlogs").update({ phase: "available" }).eq("id", backlogId);
    await supabase
      .from("backlog_phase_history")
      .update({ completed_at: now })
      .eq("backlog_id", backlogId)
      .eq("phase", "refinement")
      .is("completed_at", null);
    await supabase.from("backlog_phase_history").insert({
      backlog_id: backlogId,
      phase: "available",
      entered_at: now,
    });
    get().fetchAll();
  },
}));

async function refreshSubItems(backlogId: string) {
  const { data: subItems } = await supabase
    .from("backlog_sub_items")
    .select("*")
    .eq("backlog_id", backlogId)
    .order("sort_order");

  if (subItems) {
    const mapped = subItems.map((si: any) => ({
      id: si.id,
      title: si.title,
      functionalDetail: si.functional_detail,
      technicalDetail: si.technical_detail,
      estimate: si.estimate,
      attachment: si.attachment,
      order: si.sort_order,
    }));

    const { data: backlog } = await supabase.from("backlogs").select("refinement").eq("id", backlogId).single();

    const currentRefinement = (backlog?.refinement as any) ?? {};
    await supabase
      .from("backlogs")
      .update({
        refinement: { ...currentRefinement, subItems: mapped } as any,
      })
      .eq("id", backlogId);
  }
}
