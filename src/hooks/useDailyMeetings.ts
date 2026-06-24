import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface DailyMeeting {
  id: string;
  squad_id: string | null;
  meeting_date: string;
  conducted_by: string | null;
  observations: string | null;
  transcript_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyAttendance {
  id: string;
  meeting_id: string;
  member_user_id: string | null;
  member_name: string | null;
  camera_on: boolean;
  stayed_silent: boolean;
  dev_entry_id: string | null;
}

export function useDailyMeetings(filters?: { squadId?: string | null; from?: string; to?: string }) {
  return useQuery({
    queryKey: ["daily_meetings", filters?.squadId ?? "all", filters?.from ?? "", filters?.to ?? ""],
    queryFn: async () => {
      let q = (supabase.from("daily_meetings") as any).select("*");
      if (filters?.squadId) q = q.eq("squad_id", filters.squadId);
      if (filters?.from) q = q.gte("meeting_date", filters.from);
      if (filters?.to) q = q.lte("meeting_date", filters.to);
      const { data, error } = await q.order("meeting_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DailyMeeting[];
    },
  });
}

export function useDailyMeeting(id: string | null) {
  return useQuery({
    queryKey: ["daily_meeting", id],
    enabled: !!id,
    queryFn: async () => {
      const { data: m, error } = await (supabase.from("daily_meetings") as any)
        .select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      const { data: att } = await (supabase.from("daily_meeting_attendance") as any)
        .select("*").eq("meeting_id", id!);
      return { meeting: m as DailyMeeting, attendance: (att ?? []) as DailyAttendance[] };
    },
  });
}

export function useCreateDailyMeeting() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      meeting_date: string;
      squad_id: string | null;
      observations: string;
      transcript_url: string | null;
      attendance: { member_name: string; member_user_id?: string | null; camera_on: boolean; stayed_silent: boolean; dev_entry_id?: string | null; notes?: string | null }[];
    }) => {
      const { data: meeting, error } = await (supabase.from("daily_meetings") as any).insert({
        meeting_date: input.meeting_date,
        squad_id: input.squad_id,
        conducted_by: user?.id ?? null,
        observations: input.observations,
        transcript_url: input.transcript_url,
        updated_by: user?.id ?? null,
      }).select("*").single();
      if (error) throw error;
      if (input.attendance.length > 0) {
        const rows = input.attendance.map(a => ({ ...a, meeting_id: meeting.id }));
        const { error: e2 } = await (supabase.from("daily_meeting_attendance") as any).insert(rows);
        if (e2) throw e2;
      }
      return meeting as DailyMeeting;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily_meetings"] });
      toast.success("Daily registrada!");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });
}

export function useAllAttendance() {
  return useQuery({
    queryKey: ["daily_meeting_attendance", "all"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("daily_meeting_attendance") as any).select("*");
      if (error) throw error;
      return (data ?? []) as DailyAttendance[];
    },
  });
}
