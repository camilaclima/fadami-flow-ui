import { useEffect, useState } from "react";
import { Loader2, Sparkles, MessageSquare, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { useTeamMembers } from "@/hooks/useTeamMembers";

interface DailyRow {
  id: string;
  product_id: string;
  sprint_id: string;
  status_date: string;
  present_member_ids: string[];
  summary: string;
  blocker_level: number;
  ai_insights: any;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  daily: DailyRow | null;
  onSaved?: () => void;
}

function parseSummary(summary: string, memberNameMap: Record<string, string>, memberIds: string[]) {
  const blocks = summary.split(/\n=== /).map((b, i) => (i === 0 ? b.replace(/^=== /, "") : b));
  const reports: Record<string, string> = {};
  let general = "";
  for (const block of blocks) {
    const idx = block.indexOf("\n");
    if (idx === -1) continue;
    const header = block.slice(0, idx).replace(/=+$/, "").trim();
    const body = block.slice(idx + 1).replace(/=+$/, "").trim();
    if (header.toLowerCase().startsWith("observações gerais")) {
      general = body;
      continue;
    }
    const id = memberIds.find((mid) => (memberNameMap[mid] ?? "").trim() === header);
    if (id) reports[id] = body;
  }
  return { reports, general };
}

export function EditDailyDialog({ open, onOpenChange, daily, onSaved }: Props) {
  const qc = useQueryClient();
  const { data: teamMembers = [] } = useTeamMembers();
  const memberNameMap = Object.fromEntries(teamMembers.map((m) => [m.id, m.name]));

  const [memberReports, setMemberReports] = useState<Record<string, string>>({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && daily) {
      const ids = daily.present_member_ids ?? [];
      const { reports, general } = parseSummary(daily.summary ?? "", memberNameMap, ids);
      setMemberReports(reports);
      setGeneralNotes(general);
    }
  }, [open, daily?.id]); // eslint-disable-line

  if (!daily) return null;

  const presentIds = daily.present_member_ids ?? [];

  const buildSummary = () => {
    const blocks: string[] = [];
    for (const id of presentIds) {
      const text = (memberReports[id] ?? "").trim();
      if (!text) continue;
      const name = memberNameMap[id] ?? id;
      blocks.push(`=== ${name} ===\n${text}`);
    }
    if (generalNotes.trim()) blocks.push(`=== Observações Gerais da Coordenação ===\n${generalNotes.trim()}`);
    return blocks.join("\n\n");
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const summary = buildSummary();
      const presentNames = presentIds.map((id) => memberNameMap[id] ?? id);

      // Reload history (excluding this daily) for AI context
      const { data: hist } = await (supabase.from("daily_status") as any)
        .select("*").eq("product_id", daily.product_id).neq("id", daily.id)
        .order("status_date", { ascending: false }).limit(30);

      const { data: aiData, error: aiErr } = await supabase.functions.invoke("analyze-daily-status", {
        body: {
          todaySummary: summary,
          presentMembers: presentNames,
          history: (hist ?? []).map((h: any) => ({
            status_date: h.status_date, summary: h.summary, blocker_level: h.blocker_level, ai_insights: h.ai_insights,
          })),
        },
      });
      if (aiErr) throw aiErr;
      const insights = aiData?.insights;
      const aiBlockerLevel = Math.min(5, Math.max(1, Math.round(Number(insights?.blocker_level ?? daily.blocker_level))));

      const { error } = await (supabase.from("daily_status") as any).update({
        summary, blocker_level: aiBlockerLevel, ai_insights: insights,
      }).eq("id", daily.id);
      if (error) throw error;

      qc.invalidateQueries({ queryKey: ["daily_status_history", daily.product_id] });
      qc.invalidateQueries({ queryKey: ["daily_status_all"] });
      toast.success(`Daily atualizada! Bloqueio (IA): ${aiBlockerLevel}/5`);
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Erro ao atualizar daily");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Daily</DialogTitle>
          <DialogDescription>
            Disponível por até 72h após criação. A IA recalcula o nível de bloqueio ao salvar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-3">
            <Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Membros presentes</Label>
            <div className="flex flex-wrap gap-1.5">
              {presentIds.map((id) => (
                <span key={id} className="px-2.5 py-1 rounded-full text-xs bg-muted border border-border">
                  {memberNameMap[id] ?? id}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Relato individual por membro
            </Label>
            {presentIds.map((id) => {
              const name = memberNameMap[id] ?? id;
              const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
              return (
                <div key={id} className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">
                      {initials}
                    </div>
                    <span className="text-sm font-medium">{name}</span>
                  </div>
                  <Textarea
                    value={memberReports[id] ?? ""}
                    onChange={(e) => setMemberReports((prev) => ({ ...prev, [id]: e.target.value }))}
                    rows={3}
                    className="resize-none text-sm"
                  />
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <Label>Observações Gerais da Coordenação</Label>
            <Textarea value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} rows={3} className="resize-none" />
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : <><Sparkles className="h-4 w-4 mr-2" />Salvar e reanalisar</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}