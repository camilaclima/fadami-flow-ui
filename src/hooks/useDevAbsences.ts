import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export type DevAbsenceType = "atestado" | "ferias" | "banco_horas" | "interjornada" | "day_off";

export const DEV_ABSENCE_LABELS: Record<DevAbsenceType, string> = {
  atestado: "Atestado",
  ferias: "Férias",
  banco_horas: "Banco de horas",
  interjornada: "Interjornada",
  day_off: "Day Off",
};

/** Tipos que exigem período (data inicial + final) */
export const DEV_ABSENCE_RANGED: DevAbsenceType[] = ["atestado", "ferias", "banco_horas"];

export interface DevAbsence {
  id: string;
  user_id: string;
  squad_id: string | null;
  absence_type: DevAbsenceType;
  start_date: string;
  end_date: string;
  notes: string | null;
  created_by: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/** Ausências ativas que cobrem a data informada, para os usuários informados. */
export function useActiveDevAbsences(userIds: string[], date: string) {
  return useQuery({
    queryKey: ["dev_absences", "active", date, [...userIds].sort().join(",")],
    enabled: userIds.length > 0 && !!date,
    queryFn: async () => {
      const { data, error } = await (supabase.from("dev_absences") as any)
        .select("*")
        .in("user_id", userIds)
        .eq("active", true)
        .lte("start_date", date)
        .gte("end_date", date);
      if (error) throw error;
      return (data ?? []) as DevAbsence[];
    },
  });
}

export function useCreateDevAbsence() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      user_id: string;
      squad_id: string | null;
      absence_type: DevAbsenceType;
      start_date: string;
      end_date: string;
      notes?: string | null;
    }) => {
      const { data, error } = await (supabase.from("dev_absences") as any)
        .insert({
          ...input,
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as DevAbsence;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dev_absences"] });
      toast.success("Ausência registrada");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao registrar ausência"),
  });
}

export function useDeactivateDevAbsence() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("dev_absences") as any)
        .update({ active: false, updated_by: user?.id ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dev_absences"] }),
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });
}