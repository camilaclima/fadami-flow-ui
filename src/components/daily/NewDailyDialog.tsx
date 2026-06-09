import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Sparkles, Loader2, CheckCircle2, MessageSquare, Users, AlertTriangle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { useActiveProducts } from "@/hooks/useProducts";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useSprints } from "@/hooks/useSprints";
import { useSprintProducts } from "@/hooks/useSprintProducts";
import { Badge } from "@/components/ui/badge";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lockedProductId?: string;
  allowedProductIds?: string[];
  allowedMemberIds?: string[];
  onSaved?: () => void;
}

export function NewDailyDialog({ open, onOpenChange, lockedProductId, allowedProductIds, allowedMemberIds, onSaved }: Props) {
  const qc = useQueryClient();
  const { data: allProducts = [] } = useActiveProducts();
  const products = useMemo(
    () => (allowedProductIds && allowedProductIds.length > 0
      ? allProducts.filter((p) => allowedProductIds.includes(p.id))
      : allProducts),
    [allProducts, allowedProductIds],
  );
  const { data: allTeamMembers = [] } = useTeamMembers();
  const { data: allSprints = [] } = useSprints();
  const { data: sprintProductLinks = [] } = useSprintProducts();
  const teamMembers = useMemo(
    () =>
      allowedMemberIds
        ? allTeamMembers.filter((m) => allowedMemberIds.includes(m.id))
        : allTeamMembers,
    [allTeamMembers, allowedMemberIds],
  );
  const isSquadFiltered = Array.isArray(allowedMemberIds);

  const [productId, setProductId] = useState<string>(lockedProductId ?? "");
  const [date, setDate] = useState<Date>(new Date());
  const [sprintLabel, setSprintLabel] = useState("");
  const [sprintId, setSprintId] = useState<string>("__none__");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberReports, setMemberReports] = useState<Record<string, string>>({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setProductId(lockedProductId ?? "");
      setDate(new Date());
      setSprintLabel("");
      setSprintId("__none__");
      setSelectedMembers([]);
      setMemberReports({});
      setGeneralNotes("");
    }
  }, [open, lockedProductId]);

  // Clear member selections if the squad's member list changes mid-form
  useEffect(() => {
    if (!isSquadFiltered) return;
    setSelectedMembers((prev) => prev.filter((id) => allowedMemberIds!.includes(id)));
    setMemberReports((prev) => {
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (allowedMemberIds!.includes(k)) next[k] = v;
      }
      return next;
    });
  }, [allowedMemberIds, isSquadFiltered]);

  const historyProductIds = useMemo(() => {
    if (productId) return [productId];
    if (allowedProductIds && allowedProductIds.length > 0) return allowedProductIds;
    if (lockedProductId) return [lockedProductId];
    return [] as string[];
  }, [productId, allowedProductIds, lockedProductId]);

  const { data: history = [] } = useQuery({
    queryKey: ["daily_status_history", [...historyProductIds].sort().join(",")],
    enabled: historyProductIds.length > 0 && open,
    queryFn: async () => {
      const { data, error } = await (supabase.from("daily_status") as any)
        .select("*").in("product_id", historyProductIds).order("status_date", { ascending: false }).limit(30);
      if (error) throw error;
      return data;
    },
  });

  const { data: masterContext } = useQuery({
    queryKey: ["project_context", productId],
    enabled: !!productId && open,
    queryFn: async () => {
      const { data, error } = await (supabase.from("project_contexts") as any)
        .select("*").eq("product_id", productId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: masterBacklog = [] } = useQuery({
    queryKey: ["project_backlog", productId],
    enabled: !!productId && open,
    queryFn: async () => {
      const { data, error } = await (supabase.from("project_backlog_items") as any)
        .select("*").eq("product_id", productId).eq("approved", true).order("sort_order", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const memberNameMap = Object.fromEntries(teamMembers.map((m) => [m.id, m.name]));

  // Previous daily insights (most recent before today) — surface pending points & bottlenecks
  const previousDaily = useMemo(() => {
    const list = (history as any[]) ?? [];
    const todayKey = format(date, "yyyy-MM-dd");
    return list.find((h) => h.status_date < todayKey) ?? list[0] ?? null;
  }, [history, date]);

  const previousAttentionPoints = useMemo(() => {
    if (!previousDaily?.ai_insights) return null;
    const ins = previousDaily.ai_insights as any;
    const truncate = (s: string, n = 110) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
    const items: { key: string; label: string }[] = [];
    (Array.isArray(ins.recorrencias) ? ins.recorrencias : []).forEach((r: any, i: number) => {
      const days = r?.dias_consecutivos ? ` (${r.dias_consecutivos}d)` : "";
      items.push({ key: `rec-${i}`, label: `🔁 ${truncate(String(r?.descricao ?? ""))}${days}` });
    });
    (Array.isArray(ins.dependencias_externas) ? ins.dependencias_externas : []).forEach((d: any, i: number) => {
      items.push({ key: `dep-${i}`, label: `🔗 ${truncate(`${d?.item ?? ""} — aguardando ${d?.bloqueador ?? ""}`)}` });
    });
    (Array.isArray(ins.proximos_passos) ? ins.proximos_passos : []).forEach((p: string, i: number) => {
      items.push({ key: `pp-${i}`, label: `✅ ${truncate(String(p))}` });
    });
    if (items.length === 0) return null;
    return { items, date: previousDaily.status_date };
  }, [previousDaily]);

  const effectiveProductId = productId || (allowedProductIds && allowedProductIds[0]) || lockedProductId || "";
  const todayStr = format(date, "yyyy-MM-dd");
  const projectSprints = useMemo(() => {
    if (!effectiveProductId) return [] as typeof allSprints;
    const linked = new Set(sprintProductLinks.filter((sp) => sp.product_id === effectiveProductId).map((sp) => sp.sprint_id));
    return allSprints.filter((s) => linked.has(s.id) || s.product_id === effectiveProductId);
  }, [allSprints, sprintProductLinks, effectiveProductId]);
  const isCurrentSprint = (s: { start_date: string; end_date: string }) =>
    s.start_date <= todayStr && todayStr <= s.end_date;

  const toggleMember = (id: string) =>
    setSelectedMembers((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev];
      if (!next.includes(id)) {
        setMemberReports((r) => {
          const { [id]: _, ...rest } = r;
          return rest;
        });
      }
      return next;
    });

  const buildCompositeSummary = () => {
    const blocks = selectedMembers
      .map((id) => {
        const name = memberNameMap[id] ?? id;
        const text = (memberReports[id] ?? "").trim();
        if (!text) return null;
        return `=== ${name} ===\n${text}`;
      })
      .filter(Boolean) as string[];
    if (generalNotes.trim()) {
      blocks.push(`=== Observações Gerais da Coordenação ===\n${generalNotes.trim()}`);
    }
    return blocks.join("\n\n");
  };

  const handleSave = async () => {
    if (!effectiveProductId) {
      toast.error("Selecione o projeto.");
      return;
    }
    if (sprintId === "__none__") {
      toast.error("Selecione uma sprint para salvar a daily.");
      return;
    }
    if (selectedMembers.length === 0) {
      toast.error("Selecione pelo menos um membro presente.");
      return;
    }
    const filledMembers = selectedMembers.filter((id) => (memberReports[id] ?? "").trim().length > 0);
    if (filledMembers.length === 0 && !generalNotes.trim()) {
      toast.error("Preencha o relato de pelo menos um membro ou as observações gerais.");
      return;
    }
    const compositeSummary = buildCompositeSummary();
    setLoading(true);
    try {
      const presentNames = selectedMembers.map((id) => memberNameMap[id] ?? id);
      const { data: aiData, error: aiError } = await supabase.functions.invoke("analyze-daily-status", {
        body: {
          todaySummary: compositeSummary,
          presentMembers: presentNames,
          history: (history as any[]).map((h) => ({
            status_date: h.status_date,
            summary: h.summary,
            blocker_level: h.blocker_level,
            ai_insights: h.ai_insights,
          })),
          masterContext: (masterContext as any)?.ai_summary ?? (masterContext as any)?.documentation ?? "",
          masterBacklog: (masterBacklog as any[]).map((b) => ({
            task: b.task,
            category: b.category,
            likely_owner: b.likely_owner,
          })),
        },
      });
      if (aiError) throw aiError;
      const insights = aiData?.insights;
      const aiBlockerLevel = Math.min(5, Math.max(1, Math.round(Number(insights?.blocker_level ?? 1))));

      const { error: insertErr } = await (supabase.from("daily_status") as any).insert({
        product_id: effectiveProductId,
        sprint_id: sprintId === "__none__" ? null : sprintId,
        sprint_label: sprintLabel.trim() || (sprintId !== "__none__" ? allSprints.find((s) => s.id === sprintId)?.name ?? "" : ""),
        status_date: format(date, "yyyy-MM-dd"),
        present_member_ids: selectedMembers,
        summary: compositeSummary,
        blocker_level: aiBlockerLevel,
        ai_insights: insights,
      });
      if (insertErr) throw insertErr;

      await Promise.all([
        qc.invalidateQueries({ queryKey: ["daily_status_history"] }),
        qc.invalidateQueries({ queryKey: ["daily_status_all"] }),
        qc.invalidateQueries({ queryKey: ["daily_status_squad"] }),
      ]);
      toast.success(`Daily registrada! Nível de bloqueio (IA): ${aiBlockerLevel}/5`);
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Erro ao salvar daily");
    } finally {
      setLoading(false);
    }
  };

  const lockedProduct = products.find((p) => p.id === lockedProductId);
  const lockedProducts = allowedProductIds && allowedProductIds.length > 0
    ? allProducts.filter((p) => allowedProductIds.includes(p.id))
    : [];
  const isSquadMode = !lockedProductId && lockedProducts.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Daily</DialogTitle>
          <DialogDescription>
            Preencha o relato individual de cada membro presente. A IA calculará o nível de bloqueio automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Projeto</Label>
              {lockedProductId ? (
                <div className="h-10 px-3 flex items-center rounded-md border border-input bg-muted/40 text-sm">
                  {lockedProduct?.name ?? "—"}
                </div>
              ) : isSquadMode ? (
                <div className="min-h-10 px-3 py-2 flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-muted/40 text-sm">
                  {lockedProducts.map((p) => (
                    <span
                      key={p.id}
                      className="px-2 py-0.5 rounded-full text-xs font-medium border"
                      style={{ backgroundColor: `${p.color}20`, borderColor: `${p.color}55`, color: p.color }}
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              ) : (
                <Select value={productId} onValueChange={(v) => setProductId(v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "PPP", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Sprint</Label>
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
                  {projectSprints.length === 0 && effectiveProductId && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma sprint cadastrada para este projeto.</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {previousAttentionPoints && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                Pontos pendentes da última daily ({format(new Date(previousAttentionPoints.date + "T00:00:00"), "dd/MM/yyyy")})
              </div>
              <p className="text-xs text-muted-foreground">
                Pergunte à equipe se cada item abaixo foi resolvido, melhorou ou continua travando.
              </p>
              <div className="grid gap-2 md:grid-cols-2 text-xs">
                {previousAttentionPoints.recorrencias.length > 0 && (
                  <div className="space-y-1">
                    <div className="font-medium text-foreground">🔁 Gargalos recorrentes</div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {previousAttentionPoints.recorrencias.map((r: any, i: number) => (
                        <li key={i}>
                          {r.descricao}
                          {r.dias_consecutivos ? ` (${r.dias_consecutivos}d)` : ""}
                          {r.responsavel ? ` — ${r.responsavel}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {previousAttentionPoints.riscos.length > 0 && (
                  <div className="space-y-1">
                    <div className="font-medium text-foreground">⚠️ Riscos</div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {previousAttentionPoints.riscos.map((r: string, i: number) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
                {previousAttentionPoints.dependencias.length > 0 && (
                  <div className="space-y-1">
                    <div className="font-medium text-foreground">🔗 Dependências</div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {previousAttentionPoints.dependencias.map((d: any, i: number) => (
                        <li key={i}>{d.item} — aguardando {d.bloqueador}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {previousAttentionPoints.sobrecarregados.length > 0 && (
                  <div className="space-y-1">
                    <div className="font-medium text-foreground">🥵 Sobrecarregados</div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {previousAttentionPoints.sobrecarregados.map((s: any, i: number) => (
                        <li key={i}>{s.nome} — {s.motivo}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {previousAttentionPoints.proximos.length > 0 && (
                  <div className="space-y-1 md:col-span-2">
                    <div className="font-medium text-foreground">✅ Próximos passos sugeridos anteriormente</div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {previousAttentionPoints.proximos.map((p: string, i: number) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Membros presentes</Label>
            <div className="flex flex-wrap gap-2 rounded-md border border-input bg-background p-3 min-h-[44px]">
              {teamMembers.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  {isSquadFiltered
                    ? "Esta squad não possui membros vinculados. Configure-a no menu de Cadastros."
                    : "Nenhum colaborador cadastrado"}
                </span>
              )}
              {teamMembers.map((m) => {
                const active = selectedMembers.includes(m.id);
                return (
                  <button key={m.id} type="button" onClick={() => toggleMember(m.id)}
                    className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-all",
                      active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent border-border")}>
                    {active && <CheckCircle2 className="inline h-3 w-3 mr-1" />}
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedMembers.length > 0 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Relato individual por membro
              </Label>
              <div className="space-y-3">
                {selectedMembers.map((id) => {
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
                        placeholder={`O que ${name.split(" ")[0]} fez ontem, fará hoje e impedimentos...`}
                        className="resize-none text-sm"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Observações Gerais da Coordenação</Label>
            <Textarea
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              rows={3}
              placeholder="Notas neutras da coordenação: contexto da sprint, decisões, alertas gerais..."
              className="resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              {(history as any[]).length > 0
                ? `${(history as any[]).length} daily(s) anteriores serão usadas como contexto.`
                : "Sem histórico — primeira daily deste projeto."}
            </p>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analisando...</> : <><Sparkles className="h-4 w-4 mr-2" />Salvar e analisar</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
