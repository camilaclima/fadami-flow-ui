import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DailyInsight {
  dev_name: string;
  suggested_questions: string[];
}

export function useGenerateDailyInsights() {
  return useMutation({
    mutationFn: async (entries: { dev_name: string; did_yesterday?: string; will_do_today?: string; impediments?: string }[]) => {
      const { data, error } = await supabase.functions.invoke("generate-daily-insights", {
        body: { entries },
      });
      if (error) throw error;
      return (data?.insights ?? []) as DailyInsight[];
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao gerar insights"),
  });
}
