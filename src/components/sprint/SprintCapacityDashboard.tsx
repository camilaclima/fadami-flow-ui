import { useSprintMembers, useSprintUnavailabilities, useSprintBacklogItems, getBusinessDays, useAddSprintMember, useRemoveSprintMember, useAddSprintUnavailability, useDeleteSprintUnavailability } from "@/hooks/useSprints";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, UserPlus } from "lucide-react";
import { useState } from "react";
import type { Sprint, UnavailabilityType } from "@/types/sprint";
import { SPECIALTY_LABELS, UNAVAILABILITY_LABELS } from "@/types/sprint";

interface Props { sprint: Sprint; }

export function SprintCapacityDashboard({ sprint }: Props) {
  const { data: members = [] } = useSprintMembers(sprint.id);
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: unavailabilities = [] } = useSprintUnavailabilities(sprint.id);
  const { data: sprintItems = [] } = useSprintBacklogItems(sprint.id);
  const addMember = useAddSprintMember();
  const removeMember = useRemoveSprintMember();
  const addUnavail = useAddSprintUnavailability();
  const deleteUnavail = useDeleteSprintUnavailability();

  const [selectedMember, setSelectedMember] = useState("");
  const [unavailType, setUnavailType] = useState<UnavailabilityType>("day_off");
  const [unavailHours, setUnavailHours] = useState(8);
  const [unavailMemberId, setUnavailMemberId] = useState("");

  const businessDays = getBusinessDays(sprint.start_date, sprint.end_date);
  const memberTeamMap = Object.fromEntries(teamMembers.map((t) => [t.id, t]));

  // Capacity calculations
  const totalHoursBase = members.reduce((sum, m) => {
    const tm = memberTeamMap[m.team_member_id];
    return sum + (tm ? tm.daily_capacity_hours * businessDays : 0);
  }, 0);

  const totalUnavailHours = unavailabilities.reduce((sum, u) => sum + u.hours, 0);
  const baseCapacity = totalHoursBase - totalUnavailHours - sprint.ritual_hours;
  const usefulCapacity = baseCapacity * (1 - sprint.sustentation_percent / 100);

  const allocatedHours = sprintItems.reduce((sum, item) => {
    // Use sub-item estimate from backlog
    return sum + (item.actual_hours || 0);
  }, 0);
  const remainingCapacity = usefulCapacity - allocatedHours;

  const assignedMembers = new Set(members.map((m) => m.team_member_id));
  const availableTeam = teamMembers.filter((t) => !assignedMembers.has(t.id));

  const handleAddMember = () => {
    if (!selectedMember) return;
    addMember.mutate({ sprint_id: sprint.id, team_member_id: selectedMember });
    setSelectedMember("");
  };

  const handleAddUnavail = () => {
    if (!unavailMemberId) return;
    const sprintMember = members.find((m) => m.team_member_id === unavailMemberId);
    if (!sprintMember) return;
    addUnavail.mutate({ sprint_member_id: sprintMember.id, type: unavailType, hours: unavailHours, description: "" });
    setUnavailHours(8);
  };

  // Per-member capacity
  const memberCapacity = members.map((m) => {
    const tm = memberTeamMap[m.team_member_id];
    if (!tm) return null;
    const base = tm.daily_capacity_hours * businessDays;
    const unavail = unavailabilities.filter((u) => u.sprint_member_id === m.id).reduce((s, u) => s + u.hours, 0);
    const individual = (base - unavail) * (1 - sprint.sustentation_percent / 100);
    const allocated = sprintItems.filter((si) => si.team_member_id === m.team_member_id).reduce((s, si) => s + (si.actual_hours || 0), 0);
    return { ...tm, sprintMemberId: m.id, base, unavail, capacity: individual, allocated, pct: individual > 0 ? (allocated / individual) * 100 : 0 };
  }).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Dias Úteis", value: `${businessDays}d` },
          { label: "Capacity Total", value: `${totalHoursBase.toFixed(0)}h` },
          { label: "Capacity Útil", value: `${usefulCapacity.toFixed(0)}h` },
          { label: "Restante", value: `${remainingCapacity.toFixed(0)}h`, alert: remainingCapacity < 0 },
        ].map((card) => (
          <div key={card.label} className={`bg-card border rounded-xl p-4 ${card.alert ? "border-destructive" : "border-border"}`}>
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.alert ? "text-destructive" : "text-foreground"}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Add member */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-sm text-foreground">Membros da Sprint</h3>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger><SelectValue placeholder="Selecionar colaborador" /></SelectTrigger>
              <SelectContent>
                {availableTeam.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} — {SPECIALTY_LABELS[t.specialty] ?? t.specialty}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleAddMember} disabled={!selectedMember}><UserPlus className="w-4 h-4 mr-1" /> Adicionar</Button>
        </div>

        {/* Members list with capacity bars */}
        <div className="space-y-2 mt-3">
          {memberCapacity.map((mc) => mc && (
            <div key={mc.id} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{mc.name}</span>
                  <Badge variant="outline" className="text-[10px]">{SPECIALTY_LABELS[mc.specialty] ?? mc.specialty}</Badge>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Progress value={Math.min(mc.pct, 100)} className={`h-2 flex-1 ${mc.pct > 100 ? "[&>div]:bg-destructive" : ""}`} />
                  <span className={`text-xs font-mono ${mc.pct > 100 ? "text-destructive" : "text-muted-foreground"}`}>
                    {mc.allocated.toFixed(0)}/{mc.capacity.toFixed(0)}h
                  </span>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeMember.mutate({ id: mc.sprintMemberId, sprintId: sprint.id })}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Unavailabilities */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-sm text-foreground">Indisponibilidades</h3>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="w-48">
            <Label className="text-xs">Colaborador</Label>
            <Select value={unavailMemberId} onValueChange={setUnavailMemberId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.team_member_id} value={m.team_member_id}>{memberTeamMap[m.team_member_id]?.name ?? "—"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <Label className="text-xs">Tipo</Label>
            <Select value={unavailType} onValueChange={(v) => setUnavailType(v as UnavailabilityType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(UNAVAILABILITY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-24">
            <Label className="text-xs">Horas</Label>
            <Input type="number" min={0} step={0.5} value={unavailHours} onChange={(e) => setUnavailHours(Number(e.target.value))} />
          </div>
          <Button size="sm" onClick={handleAddUnavail} disabled={!unavailMemberId}><Plus className="w-4 h-4" /></Button>
        </div>

        <div className="space-y-1">
          {unavailabilities.map((u) => {
            const sm = members.find((m) => m.id === u.sprint_member_id);
            const tm = sm ? memberTeamMap[sm.team_member_id] : null;
            return (
              <div key={u.id} className="flex items-center justify-between bg-muted/20 rounded px-3 py-1.5 text-sm">
                <span>{tm?.name ?? "—"} — {UNAVAILABILITY_LABELS[u.type as keyof typeof UNAVAILABILITY_LABELS] ?? u.type} — {u.hours}h</span>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteUnavail.mutate(u.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
