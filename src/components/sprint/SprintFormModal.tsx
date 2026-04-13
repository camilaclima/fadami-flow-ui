import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts } from "@/hooks/useProducts";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { CheckCircle2, Circle, Plus, X } from "lucide-react";
import { TEAM_ROLE_LABELS, UNAVAILABILITY_LABELS } from "@/types/sprint";
import type { Sprint, TeamMember, UnavailabilityType, SprintStatus } from "@/types/sprint";

interface UnavailabilityEntry {
  type: UnavailabilityType;
  hours: number;
  description: string;
}

interface SelectedMember {
  team_member_id: string;
  unavailabilities: UnavailabilityEntry[];
}

export interface SprintFormData {
  name: string;
  product_id: string | null;
  start_date: string;
  end_date: string;
  status: string;
  sustentation_percent: number;
  ritual_hours: number;
  members: SelectedMember[];
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sprint: Sprint | null;
  onSave: (data: SprintFormData) => void;
}

export function SprintFormModal({ open, onOpenChange, sprint, onSave }: Props) {
  const { data: products = [] } = useProducts();
  const { data: teamMembers = [] } = useTeamMembers();
  const [name, setName] = useState("");
  const [productId, setProductId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("planned");
  const [sustentation, setSustentation] = useState(0);
  const [ritualHours, setRitualHours] = useState(0);
  const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([]);

  useEffect(() => {
    if (open) {
      setName(sprint?.name ?? "");
      setProductId(sprint?.product_id ?? "");
      setStartDate(sprint?.start_date ?? "");
      setEndDate(sprint?.end_date ?? "");
      setStatus(sprint?.status ?? "planned");
      setSustentation(sprint?.sustentation_percent ?? 0);
      setRitualHours(sprint?.ritual_hours ?? 0);
      setSelectedMembers([]);
    }
  }, [open, sprint]);

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) => {
      const exists = prev.find((m) => m.team_member_id === memberId);
      if (exists) return prev.filter((m) => m.team_member_id !== memberId);
      return [...prev, { team_member_id: memberId, unavailabilities: [] }];
    });
  };

  const addUnavailability = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.map((m) =>
        m.team_member_id === memberId
          ? { ...m, unavailabilities: [...m.unavailabilities, { type: "day_off", hours: 8, description: "" }] }
          : m
      )
    );
  };

  const removeUnavailability = (memberId: string, idx: number) => {
    setSelectedMembers((prev) =>
      prev.map((m) =>
        m.team_member_id === memberId
          ? { ...m, unavailabilities: m.unavailabilities.filter((_, i) => i !== idx) }
          : m
      )
    );
  };

  const updateUnavailability = (memberId: string, idx: number, field: keyof UnavailabilityEntry, value: any) => {
    setSelectedMembers((prev) =>
      prev.map((m) =>
        m.team_member_id === memberId
          ? {
              ...m,
              unavailabilities: m.unavailabilities.map((u, i) =>
                i === idx ? { ...u, [field]: value } : u
              ),
            }
          : m
      )
    );
  };

  const isSelected = (id: string) => selectedMembers.some((m) => m.team_member_id === id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) return;
    onSave({
      name: name.trim(),
      product_id: productId || null,
      start_date: startDate,
      end_date: endDate,
      status,
      sustentation_percent: sustentation,
      ritual_hours: ritualHours,
      members: selectedMembers,
    });
    onOpenChange(false);
  };

  const memberMap = Object.fromEntries(teamMembers.map((m) => [m.id, m]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sprint ? "Editar Sprint" : "Nova Sprint"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome da Sprint</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Sprint 12" required />
          </div>

          <div>
            <Label>Produto</Label>
            <Select value={productId || "__none__"} onValueChange={(v) => setProductId(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data início</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div>
              <Label>Data fim</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
          </div>

          {sprint && (
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planejada</SelectItem>
                  <SelectItem value="active">Em Execução</SelectItem>
                  <SelectItem value="finished">Finalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>% Sustentação</Label>
              <Input type="number" min={0} max={100} step={1} value={sustentation} onChange={(e) => setSustentation(Number(e.target.value))} />
            </div>
            <div>
              <Label>Horas de Ritos</Label>
              <Input type="number" min={0} step={0.5} value={ritualHours} onChange={(e) => setRitualHours(Number(e.target.value))} />
            </div>
          </div>

          {/* Collaborators section */}
          {!sprint && (
            <div className="space-y-3">
              <Label>Colaboradores</Label>
              <div className="space-y-2">
                {teamMembers.map((tm) => {
                  const selected = isSelected(tm.id);
                  const sm = selectedMembers.find((m) => m.team_member_id === tm.id);
                  return (
                    <div key={tm.id} className="border border-border rounded-lg p-3 space-y-2">
                      <button
                        type="button"
                        className="flex items-center gap-2 w-full text-left"
                        onClick={() => toggleMember(tm.id)}
                      >
                        {selected ? (
                          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className="font-medium text-foreground">{tm.name}</span>
                        <span className="text-sm text-muted-foreground">
                          ({TEAM_ROLE_LABELS[tm.role] ?? tm.role} · {tm.daily_capacity_hours}h)
                        </span>
                      </button>

                      {selected && sm && (
                        <div className="pl-7 space-y-2">
                          {sm.unavailabilities.map((u, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Select
                                value={u.type}
                                onValueChange={(v) => updateUnavailability(tm.id, idx, "type", v)}
                              >
                                <SelectTrigger className="w-[140px] h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(UNAVAILABILITY_LABELS).map(([k, label]) => (
                                    <SelectItem key={k} value={k}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                min={0}
                                step={0.5}
                                value={u.hours}
                                onChange={(e) => updateUnavailability(tm.id, idx, "hours", Number(e.target.value))}
                                className="w-[70px] h-8 text-sm"
                              />
                              <span className="text-sm text-muted-foreground">h</span>
                              <button
                                type="button"
                                onClick={() => removeUnavailability(tm.id, idx)}
                                className="text-destructive hover:text-destructive/80"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addUnavailability(tm.id)}
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Evento
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {teamMembers.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum colaborador cadastrado.</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">{sprint ? "Salvar" : "Criar Sprint"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
