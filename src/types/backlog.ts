export type Phase =
  | "prioritization"
  | "approval"
  | "functional_refinement"
  | "technical_refinement"
  | "available"
  | "planned"
  | "finished";

export const PHASES: Phase[] = [
  "prioritization",
  "approval",
  "functional_refinement",
  "technical_refinement",
  "available",
  "planned",
  "finished",
];

export const PHASE_LABELS: Record<Phase, string> = {
  prioritization: "1. Priorização",
  approval: "2. Aprovação",
  functional_refinement: "3. Ref. Funcional",
  technical_refinement: "4. Ref. Técnico",
  available: "5. Disponível",
  planned: "6. Planejado",
  finished: "7. Finalizado",
};

export type Thermometer = "low" | "medium" | "high";
export type Priority = "low" | "medium" | "high";
export type BacklogType = "functional" | "technical";
export type EffortArea = "database" | "backend" | "frontend" | "fullstack" | "";
export type Complexity = "easy" | "medium" | "hard" | "";

export const EFFORT_AREA_LABELS: Record<string, string> = {
  database: "Banco de Dados",
  backend: "Back-end",
  frontend: "Front-end",
  fullstack: "Full-stack",
};

export const COMPLEXITY_LABELS: Record<string, string> = {
  easy: "Fácil",
  medium: "Médio",
  hard: "Difícil",
};

export interface PhaseHistory {
  phase: Phase;
  enteredAt: string;
  completedAt?: string;
}

export interface PrioritizationData {
  businessValue: number;
  opportunityCost: number;
  estimate: number;
  priority: Priority;
  updatedBy?: string;
  updatedAt?: string;
}

export interface ApprovalData {
  observation: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface SubItem {
  id: string;
  title: string;
  functionalDetail: string;
  technicalDetail: string;
  estimate: number;
  attachment?: string;
  order: number;
  codeBlock?: string;
  implementationNotes?: string;
  effortArea?: EffortArea;
  complexity?: Complexity;
  status?: "valid" | "merged" | "discarded"; // Novo controle de escopo
}

export interface RefinementData {
  functionalRefinement?: string;
  technicalRefinement?: string;
  acceptanceCriteria?: string;
  definitionOfDone?: string;
  estimate?: number;
  subItems?: SubItem[];
  updatedBy?: string;
  updatedAt?: string;
}

export interface BacklogItem {
  id: string;
  title: string;
  description: string;
  attachment?: string;
  type: BacklogType;
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
