// Regras nativas (sem IA) para o Relatório Executivo da Daily.

export const AWAITING_KEYWORDS = [
  "aguardando",
  "no aguardo",
  "sem card",
  "sem demanda",
  "a definir",
  "aguardando definicao",
  "sem tarefa",
];

export function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function isAwaitingTask(today: string | null | undefined): boolean {
  const n = normalize(today);
  if (!n) return false;
  return AWAITING_KEYWORDS.some((kw) => n.includes(kw));
}

export function isShortText(txt: string | null | undefined, min = 15): boolean {
  const raw = (txt ?? "").replace(/\s+/g, " ").trim();
  return raw.length < min;
}

/**
 * Similaridade simples baseada em tokens (Jaccard).
 * Retorna valor entre 0 e 1.
 */
export function textSimilarity(a: string, b: string): number {
  const A = new Set(normalize(a).split(/\s+/).filter(Boolean));
  const B = new Set(normalize(b).split(/\s+/).filter(Boolean));
  if (A.size === 0 && B.size === 0) return 1;
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  A.forEach((t) => { if (B.has(t)) inter++; });
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function isRepeatedFromPrev(today: string, prevToday: string, threshold = 0.8): boolean {
  const a = normalize(today);
  const b = normalize(prevToday);
  if (!a || !b) return false;
  if (a === b) return true;
  return textSimilarity(a, b) >= threshold;
}

/**
 * Compara duas descrições de tarefa exigindo IGUALDADE EXATA
 * (após normalização de acentos/caixa/espacos).
 */
export function isExactSameTask(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalize(a).replace(/\s+/g, " ");
  const nb = normalize(b).replace(/\s+/g, " ");
  if (!na || !nb) return false;
  return na === nb;
}

export const MANUAL_TAG_OPTIONS = [
  { value: "bom_exemplo", label: "Bom Exemplo" },
  { value: "preenchimento_incorreto", label: "Preenchimento Incorreto ou Incompleto" },
  { value: "aguardando_tarefa", label: "Aguardando Tarefa" },
  { value: "tarefas_repetidas", label: "Tarefas Repetidas" },
] as const;

export type ManualTag = typeof MANUAL_TAG_OPTIONS[number]["value"];