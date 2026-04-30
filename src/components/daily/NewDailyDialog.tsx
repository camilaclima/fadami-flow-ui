import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Sparkles, Loader2, CheckCircle2, MessageSquare, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { useActiveProducts } from "@/hooks/useProducts";
import { useTeamMembers } from "@/hooks/useTeamMembers";

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
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberReports, setMemberReports] = useState<Record<string, string>>({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setProductId(lockedProductId ?? "");
      setDate(new Date());
      setSprintLabel("");
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

  const { data: history = [] } = useQuery({
    queryKey: ["daily_status_history", productId],
    enabled: !!productId && open,
    queryFn: async () => {
      const { data, error } = await (supabase.from("daily_status") as any)
        .select("*").eq("product_id", productId).order("status_date", { ascending: false }).limit(30);
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
    const effectiveProductId = productId || (allowedProductIds && allowedProductIds[0]) || "";
    if (!effectiveProductId) {
      toast.error("Selecione o projeto.");
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
        sprint_id: null,
        sprint_label: sprintLabel.trim(),
        status_date: format(date, "yyyy-MM-dd"),
        present_member_ids: selectedMembers,
        summary: compositeSummary,
        blocker_level: aiBlockerLevel,
        ai_insights: insights,
      });
      if (insertErr) throw insertErr;

      qc.invalidateQueries({ queryKey: ["daily_status_history", productId] });
      qc.invalidateQueries({ queryKey: ["daily_status_all"] });
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
              <Input
                value={sprintLabel}
                onChange={(e) => setSprintLabel(e.target.value)}
                placeholder="Ex: Sprint 12"
              />
            </div>
          </div>

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
