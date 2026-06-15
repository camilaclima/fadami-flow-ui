export type TeamRole = "dev" | "analista" | "po" | "designer" | "scrum_master" | "devops";
export type Seniority = "estagiario" | "junior" | "pleno" | "senior" | "especialista";
export type Specialty = "database" | "frontend" | "backend" | "fullstack" | "infra" | "na";
export type SprintStatus = "planned" | "active" | "finished";
export type SprintItemStatus = "pending" | "in_progress" | "paused" | "withdrawn" | "completed";
export type UnavailabilityType = "day_off" | "ferias" | "treinamento" | "viagem" | "emprestado";

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  dev: "Desenvolvedor",
  analista: "Analista",
  po: "Product Owner",
  designer: "Designer",
  scrum_master: "Scrum Master",
  devops: "DevOps",
};

export const SENIORITY_LABELS: Record<Seniority, string> = {
  estagiario: "Estagiário",
  junior: "Júnior",
  pleno: "Pleno",
  senior: "Sênior",
  especialista: "Especialista",
};

export const SPECIALTY_LABELS: Record<Specialty, string> = {
  database: "Banco de Dados",
  frontend: "Front-end",
  backend: "Back-end",
  fullstack: "Full-stack",
  infra: "Infraestrutura",
  na: "Não Aplicável",
};

export const UNAVAILABILITY_LABELS: Record<UnavailabilityType, string> = {
  day_off: "Day Off",
  ferias: "Férias",
  treinamento: "Treinamento",
  viagem: "Viagem",
  emprestado: "Emprestado",
};

export const SPRINT_STATUS_LABELS: Record<SprintStatus, string> = {
  planned: "Planejada",
  active: "Em Execução",
  finished: "Finalizada",
};

export const SPRINT_ITEM_STATUS_LABELS: Record<SprintItemStatus, string> = {
  pending: "Pendente",
  in_progress: "Em Andamento",
  paused: "Pausado",
  withdrawn: "Retirado",
  completed: "Concluído",
};

export const SPRINT_ITEM_STATUS_STYLES: Record<SprintItemStatus, string> = {
  pending: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  in_progress: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  paused: "bg-orange-500/15 text-orange-600 border-orange-500/20",
  withdrawn: "bg-red-500/15 text-red-600 border-red-500/20",
  completed: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
};

/** Full-stack is compatible with frontend and backend demands */
export function isSpecialtyCompatible(memberSpecialty: Specialty, demandArea: string): boolean {
  if (!demandArea || demandArea === "") return true;
  if (memberSpecialty === demandArea) return true;
  if (memberSpecialty === "fullstack" && (demandArea === "frontend" || demandArea === "backend")) return true;
  return false;
}

export interface TeamMember {
  id: string;
  coordinator_id: string;
  product_id: string | null;
  name: string;
  email: string;
  role: TeamRole;
  seniority: Seniority;
  specialty: Specialty;
  daily_capacity_hours: number;
  active: boolean;
  created_at: string;
}

export interface Sprint {
  id: string;
  name: string;
  product_id: string | null;
  coordinator_id: string;
  start_date: string;
  end_date: string;
  status: SprintStatus;
  sustentation_percent: number;
  ritual_hours: number;
  diary: string;
  created_at: string;
}

export interface SprintMember {
  id: string;
  sprint_id: string;
  team_member_id: string;
  created_at: string;
}

export interface SprintUnavailability {
  id: string;
  sprint_member_id: string;
  type: UnavailabilityType;
  hours: number;
  description: string;
}

export interface SprintBacklogItem {
  id: string;
  sprint_id: string;
  backlog_sub_item_id: string;
  backlog_id: string;
  team_member_id: string | null;
  status: SprintItemStatus;
  actual_hours: number;
  checklist_questions: string;
  checklist_access: string;
  checklist_dependency: string;
  checklist_tools: string;
  impediment_text: string;
  impediment_deadline: string | null;
  deadline: string | null;
  created_at: string;
}
