import { useBacklogs, useBacklogSubItems } from "@/hooks/useBacklogs";
import { useSprintBacklogItems, useAddSprintBacklogItem, useRemoveSprintBacklogItem, useSprintMembers, useSprintUnavailabilities, useUpdateSprint, getBusinessDays } from "@/hooks/useSprints";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Plus, Trash2, ChevronDown, ChevronRight, CalendarIcon, Eye, CheckCircle2, Users, Clock, TrendingUp, Zap, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Sprint } from "@/types/sprint";
import { isSpecialtyCompatible, SPECIALTY_LABELS, TEAM_ROLE_LABELS } from "@/types/sprint";
import { EFFORT_AREA_LABELS, COMPLEXITY_LABELS } from "@/types/backlog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props { sprint: Sprint; }

function getCapacityColor(pct: number): string {
  if (pct >= 100) return "text-destructive";
  if (pct >= 80) return "text-amber-500";
  return "text-emerald-600";
}

function getCapacityBarClass(pct: number): string {
  if (pct >= 100) return "[&>div]:bg-destructive";
  if (pct >= 80) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-emerald-500";
}

function getCapacityCardBorder(pct: number): string {
  if (pct >= 100) return "border-destructive/50";
  if (pct >= 80) return "border-amber-500/50";
  return "border-emerald-500/50";
}

export function SprintPrePlanning({ sprint }: Props) {
  const { data: backlogs = [] } = useBacklogs();
  const { data: sprintItems = [] } = useSprintBacklogItems(sprint.id);
  const { data: sprintMembers = [] } = useSprintMembers(sprint.id);
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: unavailabilities = [] } = useSprintUnavailabilities(sprint.id);
  const addItem = useAddSprintBacklogItem();
  const removeItem = useRemoveSprintBacklogItem();
  const updateSprint = useUpdateSprint();

  const [expandedBacklog, setExpandedBacklog] = useState<string | null>(null);
  const [viewBacklog, setViewBacklog] = useState<any | null>(null);
  const [viewSubItem, setViewSubItem] = useState<any | null>(null);

  const availableBacklogs = backlogs.filter((b) => b.phase === "available" || b.phase === "planned");
  const allocatedSubItemIds = new Set(sprintItems.map((si) => si.backlog_sub_item_id));

  const memberTeamMap = Object.fromEntries(teamMembers.map((t) => [t.id, t]));
  const sprintTeamMemberIds = new Set(sprintMembers.map((m) => m.team_member_id));

  // Capacity calculations
  const businessDays = getBusinessDays(sprint.start_date, sprint.end_date);

  const totalHoursBase = sprintMembers.reduce((sum, m) => {
    const tm = memberTeamMap[m.team_member_id];
    return sum + (tm ? tm.daily_capacity_hours * businessDays : 0);
  }, 0);

  const totalUnavailHours = unavailabilities.reduce((sum, u) => sum + u.hours, 0);
  const sustentationHours = totalHoursBase * (sprint.sustentation_percent / 100);
  const baseCapacity = totalHoursBase - totalUnavailHours - sprint.ritual_hours;
  const usefulCapacity = baseCapacity * (1 - sprint.sustentation_percent / 100);

  // Get estimated hours from sub items via sprint items
  const allocatedEstimateHours = sprintItems.reduce((sum, item) => {
    return sum + (item.actual_hours || 0);
  }, 0);

  // We need to also track by sub-item estimate - let's compute from the backlog sub items we have loaded
  const remainingCapacity = usefulCapacity - allocatedEstimateHours;
  const allocationPct = usefulCapacity > 0 ? (allocatedEstimateHours / usefulCapacity) * 100 : 0;

  // Per-member capacity
  const memberCapacityData = sprintMembers.map((m) => {
    const tm = memberTeamMap[m.team_member_id];
    if (!tm) return null;
    const base = tm.daily_capacity_hours * businessDays;
    const unavail = unavailabilities.filter((u) => u.sprint_member_id === m.id).reduce((s, u) => s + u.hours, 0);
    const individual = (base - unavail) * (1 - sprint.sustentation_percent / 100);
    const allocated = sprintItems.filter((si) => si.team_member_id === m.team_member_id).reduce((s, si) => s + (si.actual_hours || 0), 0);
    const pct = individual > 0 ? (allocated / individual) * 100 : 0;
    return { ...tm, sprintMemberId: m.id, base, unavail, capacity: individual, allocated, pct };
  }).filter(Boolean) as any[];

  const anyCapacityOverflow = memberCapacityData.some((mc) => mc.pct >= 100) || allocationPct >= 100;
  const hasAllocatedItems = sprintItems.length > 0;
  const canAdvance = hasAllocatedItems && !anyCapacityOverflow;

  const handleAdvanceToPlanning = () => {
    updateSprint.mutate({ id: sprint.id, status: "planned" as any });
    toast.success("Sprint pronta para Planning!");
  };

  return (
    <div className="space-y-6">
      {/* Mini Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Dias Úteis", value: `${businessDays}`, icon: CalendarIcon, color: "text-primary" },
          { label: "Capacity Bruto", value: `${totalHoursBase.toFixed(0)}h`, icon: Users, color: "text-primary" },
          { label: "Sustentação + Ritos", value: `${(sustentationHours + sprint.ritual_hours).toFixed(0)}h`, icon: Clock, color: "text-amber-500" },
          { label: "Capacity Útil", value: `${usefulCapacity.toFixed(0)}h`, icon: TrendingUp, color: "text-primary" },
          { label: "Restante", value: `${remainingCapacity.toFixed(0)}h`, icon: Zap, color: getCapacityColor(allocationPct), border: getCapacityCardBorder(allocationPct) },
        ].map((card) => (
          <div key={card.label} className={`bg-card border rounded-xl p-4 transition-all ${card.border ?? "border-border"}`}>
            <div className="flex items-center gap-2 mb-1">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{card.label}</p>
            </div>
            <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Per-member capacity */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Capacidade por Colaborador
        </h3>
        {memberCapacityData.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum colaborador nesta sprint.</p>
        )}
        <div className="space-y-2">
          {memberCapacityData.map((mc) => (
            <div key={mc.id} className="flex items-center gap-3 bg-muted/20 rounded-lg p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium truncate">{mc.name}</span>
                  <Badge variant="outline" className="text-[10px]">{TEAM_ROLE_LABELS[mc.role as keyof typeof TEAM_ROLE_LABELS] ?? mc.role}</Badge>
                  <Badge variant="outline" className="text-[10px]">{SPECIALTY_LABELS[mc.specialty as keyof typeof SPECIALTY_LABELS] ?? mc.specialty}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={Math.min(mc.pct, 100)} className={`h-2.5 flex-1 ${getCapacityBarClass(mc.pct)}`} />
                  <span className={`text-xs font-mono min-w-[80px] text-right ${getCapacityColor(mc.pct)}`}>
                    {mc.allocated.toFixed(0)}/{mc.capacity.toFixed(0)}h ({mc.pct.toFixed(0)}%)
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Backlog Allocation */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Alocação de Backlogs Disponíveis
        </h3>
        <p className="text-xs text-muted-foreground">
          Selecione backlogs e aloque subtarefas aos colaboradores. O capacity é calculado em tempo real.
        </p>

        {availableBacklogs.length === 0 && (
          <div className="text-center text-muted-foreground py-8 bg-card border border-border rounded-xl">Nenhum backlog disponível para alocação.</div>
        )}

        {availableBacklogs.map((backlog) => (
          <BacklogAllocator
            key={backlog.id}
            backlog={backlog}
            expanded={expandedBacklog === backlog.id}
            onToggle={() => setExpandedBacklog(expandedBacklog === backlog.id ? null : backlog.id)}
            sprintId={sprint.id}
            allocatedSubItemIds={allocatedSubItemIds}
            sprintTeamMemberIds={sprintTeamMemberIds}
            memberTeamMap={memberTeamMap}
            memberCapacityData={memberCapacityData}
            onAdd={(subItemId, teamMemberId, estimate) => addItem.mutate({ sprint_id: sprint.id, backlog_sub_item_id: subItemId, backlog_id: backlog.id, team_member_id: teamMemberId, status: "pending" as any, actual_hours: estimate } as any)}
            onRemove={(itemId) => removeItem.mutate({ id: itemId, sprintId: sprint.id })}
            sprintItems={sprintItems}
            onViewBacklog={() => setViewBacklog(backlog)}
            onViewSubItem={(si: any) => setViewSubItem(si)}
          />
        ))}
      </div>

      {/* Gate Button */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-3">
          {anyCapacityOverflow && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Capacity estourado. Ajuste as alocações.</span>
            </div>
          )}
          {!hasAllocatedItems && !anyCapacityOverflow && (
            <span className="text-sm text-muted-foreground">Aloque pelo menos uma subtarefa para avançar.</span>
          )}
          {canAdvance && (
            <span className="text-sm text-emerald-600 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Tudo pronto para avançar!
            </span>
          )}
        </div>
        <Button onClick={handleAdvanceToPlanning} disabled={!canAdvance} className="gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Pronto para Planning
        </Button>
      </div>

      {/* View Backlog Modal */}
      <Dialog open={!!viewBacklog} onOpenChange={(o) => !o && setViewBacklog(null)}>
        <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewBacklog?.title}</DialogTitle>
          </DialogHeader>
          {viewBacklog && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">{viewBacklog.description || "Sem descrição."}</p>
              {viewBacklog.refinement && (
                <div className="space-y-2">
                  {viewBacklog.refinement.functionalRefinement && <div><strong>Refinamento Funcional:</strong><p className="text-muted-foreground">{viewBacklog.refinement.functionalRefinement}</p></div>}
                  {viewBacklog.refinement.technicalRefinement && <div><strong>Refinamento Técnico:</strong><p className="text-muted-foreground">{viewBacklog.refinement.technicalRefinement}</p></div>}
                  {viewBacklog.refinement.acceptanceCriteria && <div><strong>Critérios de Aceite:</strong><p className="text-muted-foreground">{viewBacklog.refinement.acceptanceCriteria}</p></div>}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View SubItem Modal */}
      <Dialog open={!!viewSubItem} onOpenChange={(o) => !o && setViewSubItem(null)}>
        <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewSubItem?.title}</DialogTitle>
          </DialogHeader>
          {viewSubItem && (
            <div className="space-y-3 text-sm">
              {viewSubItem.functional_detail && <div><strong>Detalhe Funcional:</strong><p className="text-muted-foreground whitespace-pre-wrap">{viewSubItem.functional_detail}</p></div>}
              {viewSubItem.technical_detail && <div><strong>Detalhe Técnico:</strong><p className="text-muted-foreground whitespace-pre-wrap">{viewSubItem.technical_detail}</p></div>}
              {viewSubItem.implementation_notes && <div><strong>Notas de Implementação:</strong><p className="text-muted-foreground whitespace-pre-wrap">{viewSubItem.implementation_notes}</p></div>}
              {viewSubItem.code_block && <div><strong>Código:</strong><pre className="bg-muted p-3 rounded-lg text-xs overflow-auto">{viewSubItem.code_block}</pre></div>}
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Estimativa: {viewSubItem.estimate}h</span>
                {viewSubItem.complexity && <span>Complexidade: {COMPLEXITY_LABELS[viewSubItem.complexity] ?? viewSubItem.complexity}</span>}
                {viewSubItem.effort_area && <span>Área: {EFFORT_AREA_LABELS[viewSubItem.effort_area] ?? viewSubItem.effort_area}</span>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BacklogAllocator({ backlog, expanded, onToggle, sprintId, allocatedSubItemIds, sprintTeamMemberIds, memberTeamMap, memberCapacityData, onAdd, onRemove, sprintItems, onViewBacklog, onViewSubItem }: {
  backlog: any; expanded: boolean; onToggle: () => void;
  sprintId: string; allocatedSubItemIds: Set<string>; sprintTeamMemberIds: Set<string>;
  memberTeamMap: Record<string, any>; memberCapacityData: any[];
  onAdd: (subItemId: string, teamMemberId: string | null, estimate: number) => void;
  onRemove: (itemId: string) => void; sprintItems: any[];
  onViewBacklog: () => void; onViewSubItem: (si: any) => void;
}) {
  const { data: subItems = [] } = useBacklogSubItems(expanded ? backlog.id : undefined);
  const [selectedDev, setSelectedDev] = useState<Record<string, string>>({});
  const [deadlines, setDeadlines] = useState<Record<string, Date | undefined>>({});

  const allocatedInSprint = sprintItems.filter((si) => si.backlog_id === backlog.id);
  const totalEstimate = subItems.reduce((s: number, si: any) => s + (si.estimate || 0), 0);
  const allocatedCount = subItems.filter((si: any) => allocatedSubItemIds.has(si.id)).length;

  const handleAddWithDeadline = async (subItemId: string, estimate: number) => {
    const dev = selectedDev[subItemId] || null;
    if (!dev) return;
    onAdd(subItemId, dev, estimate);
    // Update deadline if set
    const dl = deadlines[subItemId];
    if (dl) {
      setTimeout(async () => {
        const { data } = await (supabase.from("sprint_backlog_items") as any)
          .select("id")
          .eq("sprint_id", sprintId)
          .eq("backlog_sub_item_id", subItemId)
          .single();
        if (data) {
          await (supabase.from("sprint_backlog_items") as any)
            .update({ deadline: format(dl, "yyyy-MM-dd") })
            .eq("id", data.id);
        }
      }, 500);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        <div className="flex-1 text-left">
          <span className="font-medium text-sm">{backlog.title}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-muted-foreground">{totalEstimate}h estimadas</span>
            <span className="text-[11px] text-muted-foreground">•</span>
            <span className="text-[11px] text-muted-foreground">{subItems.length > 0 || !expanded ? "" : "0"} subtarefas</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {allocatedInSprint.length > 0 && (
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{allocatedCount}/{subItems.length || "?"} alocado(s)</Badge>
          )}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); onViewBacklog(); }}>
            <Eye className="w-3.5 h-3.5" />
          </Button>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-2">
          {subItems.map((si: any) => {
            const isAllocated = allocatedSubItemIds.has(si.id);
            const sprintItem = sprintItems.find((x) => x.backlog_sub_item_id === si.id);
            const effortArea = si.effort_area || "";

            const compatibleMembers = Array.from(sprintTeamMemberIds)
              .map((id) => memberTeamMap[id])
              .filter(Boolean)
              .filter((tm) => isSpecialtyCompatible(tm.specialty, effortArea));

            return (
              <div key={si.id} className="flex items-center gap-3 bg-muted/20 rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button className="text-sm font-medium hover:text-primary transition-colors text-left" onClick={() => onViewSubItem(si)}>
                      {si.title}
                    </button>
                    {effortArea && (
                      <Badge variant="outline" className="text-[10px]">{EFFORT_AREA_LABELS[effortArea] ?? effortArea}</Badge>
                    )}
                    {si.complexity && (
                      <Badge variant="outline" className="text-[10px]">{COMPLEXITY_LABELS[si.complexity] ?? si.complexity}</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{si.estimate}h estimadas</span>
                </div>

                {!isAllocated ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Deadline */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1 w-32">
                          <CalendarIcon className="w-3 h-3" />
                          {deadlines[si.id] ? format(deadlines[si.id]!, "dd/MM/yy") : "Prazo"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={deadlines[si.id]}
                          onSelect={(d) => setDeadlines((p) => ({ ...p, [si.id]: d ?? undefined }))}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    {/* Dev select */}
                    <Select value={selectedDev[si.id] ?? ""} onValueChange={(v) => setSelectedDev((p) => ({ ...p, [si.id]: v }))}>
                      <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Responsável" /></SelectTrigger>
                      <SelectContent>
                        {compatibleMembers.map((tm) => {
                          const mc = memberCapacityData.find((c: any) => c.id === tm.id);
                          return (
                            <SelectItem key={tm.id} value={tm.id}>
                              {tm.name} {mc ? `(${mc.allocated.toFixed(0)}/${mc.capacity.toFixed(0)}h)` : ""}
                            </SelectItem>
                          );
                        })}
                        {compatibleMembers.length === 0 && (
                          <SelectItem value="__none__" disabled>Sem dev compatível</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => handleAddWithDeadline(si.id, si.estimate || 0)} disabled={!selectedDev[si.id]}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 text-[10px]">
                      Alocado — {memberTeamMap[sprintItem?.team_member_id]?.name ?? "—"}
                    </Badge>
                    {sprintItem && (
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => onRemove(sprintItem.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {subItems.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum subitem neste backlog.</p>
          )}
        </div>
      )}
    </div>
  );
}
