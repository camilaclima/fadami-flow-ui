import type { DevDailyActivity } from "@/hooks/useDevDailyActivities";

export interface EntryLite {
  id: string;
  entry_date: string;
}

export interface YesterdayTodayLists {
  /** Concluídas fechadas neste registro. */
  done: DevDailyActivity[];
  /** Inativadas fechadas neste registro. */
  inactive: DevDailyActivity[];
  /** Carry-over: pendentes vindas de dias anteriores que continuavam abertas em D. */
  stillPending: DevDailyActivity[];
  /** "Ontem" = done + inactive + stillPending, na ordem de exibição. */
  yesterday: DevDailyActivity[];
  /** "Hoje" = pendentes criadas neste registro. */
  today: DevDailyActivity[];
}

/**
 * Monta as listas "Ontem" e "Hoje" para um registro (entry) de daily.
 *
 * Regras (idênticas às usadas na visão do líder no IniciarDailyModal):
 *  - "Ontem" mostra o que foi fechado neste registro (concluídas + inativadas)
 *    e também as pendências antigas que continuavam abertas no dia D.
 *  - "Hoje" mostra apenas as pendências CRIADAS neste próprio registro.
 *  - Atividades sem `origin` encontrado na lista de entries do usuário são
 *    ignoradas — evita puxar atividades de outra squad quando a lista de
 *    entries está escopada por squad.
 */
export function buildYesterdayTodayLists(params: {
  entry: EntryLite;
  activities: DevDailyActivity[];
  entriesForUser: EntryLite[];
  /** Data base D (YYYY-MM-DD). Default: entry.entry_date. */
  date?: string;
}): YesterdayTodayLists {
  const D = params.date ?? params.entry.entry_date;
  const seen = new Set<string>();
  const acts = params.activities.filter((activity) => {
    const normalized = activity.description.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
    const key = `${activity.created_entry_id ?? "legacy"}|${activity.closed_entry_id ?? "open"}|${activity.status}|${normalized}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const entryId = params.entry.id;
  const findEntry = (id: string | null | undefined) =>
    id ? params.entriesForUser.find((e) => e.id === id) ?? null : null;

  const done = acts.filter(
    (a) => a.status === "concluida" && a.closed_entry_id === entryId,
  );
  const inactive = acts.filter(
    (a) => a.status === "inativa" && a.closed_entry_id === entryId,
  );
  const stillPending = acts.filter((a) => {
    if (a.closed_entry_id === entryId) return false;
    const origin = findEntry(a.created_entry_id);
    if (!origin) return false;
    if (origin.entry_date >= D) return false;
    if (a.closed_entry_id) {
      const closed = findEntry(a.closed_entry_id);
      if (closed && closed.entry_date <= D) return false;
    }
    return true;
  });
  const today = acts.filter(
    (a) => a.status === "pendente" && a.created_entry_id === entryId,
  );
  return {
    done,
    inactive,
    stillPending,
    yesterday: [...done, ...inactive, ...stillPending],
    today,
  };
}