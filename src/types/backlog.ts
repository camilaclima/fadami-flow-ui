export type Phase =
  | "prioritization"
  | "approval"
  | "refinement"
  | "available"
  | "planned"
  | "finished";

export const PHASES: Phase[] = [
  "prioritization",
  "approval",
  "refinement",
  "available",
  "planned",
  "finished",
];

export const PHASE_LABELS: Record<Phase, string> = {
  prioritization: "Priorização",
  approval: "Aprovação",
  refinement: "Refinamento",
  available: "Disponível",
  planned: "Planejado",
  finished: "Finalizado",
};

export type Thermometer = "low" | "medium" | "high";
export type Priority = "low" | "medium" | "high";

export interface PhaseHistory {
  phase: Phase;
  enteredAt: string;
  completedAt?: string;
}

export interface PrioritizationData {
  businessValue: number; // 1-5
  opportunityCost: number; // 1-5
  estimate: number; // hours
  priority: Priority;
}

export interface ApprovalData {
  observation: string;
}

export interface RefinementData {
  functionalRefinement: string;
  technicalRefinement: string;
  acceptanceCriteria: string;
  definitionOfDone: string;
  estimate: number; // hours
}

export interface BacklogItem {
  id: string;
  title: string;
  description: string;
  attachment?: string;
  productId: string;
  clientId?: string;
  thermometer: Thermometer;
  phase: Phase;
  createdBy: string;
  createdAt: string;
  phaseHistory: PhaseHistory[];
  prioritization?: PrioritizationData;
  approval?: ApprovalData;
  refinement?: RefinementData;
}

export interface Product {
  id: string;
  name: string;
  color: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
}
