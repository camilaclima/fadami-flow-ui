import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Phase, Priority } from "@/types/backlog";

export interface BacklogRow {
  id: string;
  title: string;
  description: string;
  type: string;
  product_id: string | null;
  client_id: string | null;
  thermometer: string;
  phase: string;
  created_by: string | null;
  created_at: string;
  prioritization: any;
  approval: any;
  refinement: any;
  attachment: string | null;
}

export interface PhaseHistoryRow {
  id: string;
  backlog_id: string;
  phase: string;
  entered_at: string;
  completed_at: string | null;
}

export function useBacklogs() {
  return useQuery({
    queryKey: ["backlogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backlogs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BacklogRow[];
    },
  });
}

export function useBacklogPhaseHistory(backlogId: string | undefined) {
  return useQuery({
    queryKey: ["backlog_phase_history", backlogId],
    enabled: !!backlogId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backlog_phase_history")
        .select("*")
        .eq("backlog_id", backlogId!)
        .order("entered_at");
      if (error) throw error;
      return data as PhaseHistoryRow[];
    },
  });
}

export function useBacklogSubItems(backlogId: string | undefined) {
  return useQuery({
    queryKey: ["backlog_sub_items", backlogId],
    enabled: !!backlogId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backlog_sub_items")
        .select("*")
        .eq("backlog_id", backlogId!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

function calculatePriority(bv: number, oc: number, est: number): Priority {
  const score = (bv + oc) / 2 - est / 20;
  if (score >= 3.5) return "high";
  if (score >= 2) return "medium";
  return "low";
}

export function useAddBacklog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: {
      title: string;
      description: string;
      type: string;
      product_id: string;
      client_id?: string;
      thermometer: string;
      created_by?: string;
    }) => {
      const { data, error } = await supabase.from("backlogs").insert({
        ...item,
        phase: "prioritization",
      }).select().single();
      if (error) throw error;

      // Insert initial phase history
      await supabase.from("backlog_phase_history").insert({
        backlog_id: data.id,
        phase: "prioritization",
        entered_at: data.created_at,
      });

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backlogs"] });
      toast.success("Backlog criado!");
    },
  });
}

export function useUpdateBacklog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from("backlogs").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["backlogs"] }); },
  });
}

export function useSavePrioritization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, businessValue, opportunityCost, estimate }: {
      id: string;
      businessValue: number;
      opportunityCost: number;
      estimate: number;
    }) => {
      const priority = calculatePriority(businessValue, opportunityCost, estimate);
      const now = new Date().toISOString();

      // Update backlog
      await supabase.from("backlogs").update({
        phase: "approval",
        prioritization: { businessValue, opportunityCost, estimate, priority },
      }).eq("id", id);

      // Complete current phase history
      await supabase.from("backlog_phase_history").update({ completed_at: now })
        .eq("backlog_id", id).eq("phase", "prioritization").is("completed_at", null);

      // Add new phase history
      await supabase.from("backlog_phase_history").insert({
        backlog_id: id, phase: "approval", entered_at: now,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backlogs"] });
      qc.invalidateQueries({ queryKey: ["backlog_phase_history"] });
    },
  });
}

export function useSaveApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, observation }: { id: string; observation: string }) => {
      const now = new Date().toISOString();

      await supabase.from("backlogs").update({
        phase: "refinement",
        approval: { observation },
      }).eq("id", id);

      await supabase.from("backlog_phase_history").update({ completed_at: now })
        .eq("backlog_id", id).eq("phase", "approval").is("completed_at", null);

      await supabase.from("backlog_phase_history").insert({
        backlog_id: id, phase: "refinement", entered_at: now,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backlogs"] });
      qc.invalidateQueries({ queryKey: ["backlog_phase_history"] });
    },
  });
}

export function useSaveRefinement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...refinementData }: {
      id: string;
      functionalRefinement?: string;
      technicalRefinement?: string;
      acceptanceCriteria?: string;
      definitionOfDone?: string;
      estimate?: number;
    }) => {
      const now = new Date().toISOString();

      await supabase.from("backlogs").update({
        phase: "available",
        refinement: refinementData,
      }).eq("id", id);

      await supabase.from("backlog_phase_history").update({ completed_at: now })
        .eq("backlog_id", id).eq("phase", "refinement").is("completed_at", null);

      await supabase.from("backlog_phase_history").insert({
        backlog_id: id, phase: "available", entered_at: now,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backlogs"] });
      qc.invalidateQueries({ queryKey: ["backlog_phase_history"] });
    },
  });
}

export function useMoveToPhase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, currentPhase, newPhase }: { id: string; currentPhase: string; newPhase: string }) => {
      const now = new Date().toISOString();

      await supabase.from("backlogs").update({ phase: newPhase }).eq("id", id);

      await supabase.from("backlog_phase_history").update({ completed_at: now })
        .eq("backlog_id", id).eq("phase", currentPhase).is("completed_at", null);

      await supabase.from("backlog_phase_history").insert({
        backlog_id: id, phase: newPhase, entered_at: now,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backlogs"] });
      qc.invalidateQueries({ queryKey: ["backlog_phase_history"] });
    },
  });
}

export function useAddSubItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ backlog_id, ...data }: {
      backlog_id: string;
      title: string;
      functional_detail: string;
      technical_detail: string;
      estimate: number;
      attachment?: string;
    }) => {
      // Get current max order
      const { data: existing } = await supabase
        .from("backlog_sub_items")
        .select("sort_order")
        .eq("backlog_id", backlog_id)
        .order("sort_order", { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

      const { error } = await supabase.from("backlog_sub_items").insert({
        ...data,
        backlog_id,
        sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["backlog_sub_items", vars.backlog_id] });
    },
  });
}

export function useUpdateSubItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, backlog_id, ...data }: {
      id: string;
      backlog_id: string;
      title: string;
      functional_detail: string;
      technical_detail: string;
      estimate: number;
      attachment?: string;
    }) => {
      const { error } = await supabase.from("backlog_sub_items").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["backlog_sub_items", vars.backlog_id] });
    },
  });
}

export function useDeleteSubItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, backlog_id }: { id: string; backlog_id: string }) => {
      const { error } = await supabase.from("backlog_sub_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["backlog_sub_items", vars.backlog_id] });
    },
  });
}
