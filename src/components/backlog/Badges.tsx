import type { Thermometer, Priority, Phase } from "@/types/backlog";
import { PHASE_LABELS } from "@/types/backlog";

const thermoConfig: Record<Thermometer, { label: string; className: string }> = {
  low: { label: "Baixo", className: "bg-thermo-low/15 text-thermo-low" },
  medium: { label: "Médio", className: "bg-thermo-medium/15 text-thermo-medium" },
  high: { label: "Alto", className: "bg-thermo-high/15 text-thermo-high" },
};

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  low: { label: "Baixa", className: "bg-priority-low/15 text-priority-low" },
  medium: { label: "Média", className: "bg-priority-medium/15 text-priority-medium" },
  high: { label: "Alta", className: "bg-priority-high/15 text-priority-high" },
};

const phaseConfig: Record<Phase, string> = {
  prioritization: "bg-phase-prioritization/15 text-phase-prioritization",
  approval: "bg-phase-approval/15 text-phase-approval",
  refinement: "bg-phase-refinement/15 text-phase-refinement",
  available: "bg-phase-available/15 text-phase-available",
  planned: "bg-phase-planned/15 text-phase-planned",
  finished: "bg-phase-finished/15 text-phase-finished",
};

export function ThermoBadge({ value }: { value: Thermometer }) {
  const c = thermoConfig[value];
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold ${c.className}`}>{c.label}</span>;
}

export function PriorityBadge({ value }: { value: Priority }) {
  const c = priorityConfig[value];
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold ${c.className}`}>{c.label}</span>;
}

export function PhaseBadge({ value }: { value: Phase }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold ${phaseConfig[value]}`}>
      {PHASE_LABELS[value]}
    </span>
  );
}
