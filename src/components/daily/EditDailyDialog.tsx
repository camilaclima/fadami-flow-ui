import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, MessageSquare, Users, GitBranch } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useSprints } from "@/hooks/useSprints";
import { useSprintProducts } from "@/hooks/useSprintProducts";

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
  const { data: allSprints = [] } = useSprints();
  const { data: sprintProductLinks = [] } = useSprintProducts();
  const memberNameMap = Object.fromEntries(teamMembers.map((m) => [m.id, m.name]));

  const [memberReports, setMemberReports] = useState<Record<string, string>>({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [sprintId, setSprintId] = useState<string>("__none__");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && daily) {
      const ids = daily.present_member_ids ?? [];
      const { reports, general } = parseSummary(daily.summary ?? "", memberNameMap, ids);
      setMemberReports(reports);
      setGeneralNotes(general);
      setSprintId(daily.sprint_id ?? "__none__");
    }
  }, [open, daily?.id]); // eslint-disable-line

  const todayStr = new Date().toISOString().slice(0, 10);
  const projectSprints = useMemo(() => {
    if (!daily) return [] as typeof allSprints;
    const linked = new Set(
      sprintProductLinks.filter((sp) => sp.product_id === daily.product_id).map((sp) => sp.sprint_id),
    );
    return allSprints.filter((s) => linked.has(s.id) || s.product_id === daily.product_id);
  }, [allSprints, sprintProductLinks, daily?.product_id]);

  if (!daily) return null;

  const presentIds = daily.present_member_ids ?? [];
  const isCurrentSprint = (s: { start_date: string; end_date: string }) =>
    s.start_date <= todayStr && todayStr <= s.end_date;

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
    if (sprintId === "__none__") {
      toast.error("Selecione uma sprint para salvar a daily.");
      return;
    }
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
        summary,
        blocker_level: aiBlockerLevel,
        ai_insights: insights,
        sprint_id: sprintId === "__none__" ? null : sprintId,
        sprint_label:
          sprintId === "__none__"
            ? ""
            : (allSprints.find((s) => s.id === sprintId)?.name ?? ""),
      }).eq("id", daily.id);
      if (error) throw error;

      qc.invalidateQueries({ queryKey: ["daily_status_history", daily.product_id] });
      qc.invalidateQueries({ queryKey: ["daily_status_all"] });
      qc.invalidateQueries({ queryKey: ["daily_status_all_agg"] });
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
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><GitBranch className="h-4 w-4" /> Sprint</Label>
            <Select value={sprintId} onValueChange={setSprintId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a sprint" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Sem sprint —</SelectItem>
                {projectSprints.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      {s.name}
                      {isCurrentSprint(s) && (
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[9px] px-1.5 py-0 h-4" variant="outline">
                          Atual
                        </Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
                {projectSprints.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma sprint cadastrada para este projeto.</div>
                )}
              </SelectContent>
            </Select>
          </div>

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