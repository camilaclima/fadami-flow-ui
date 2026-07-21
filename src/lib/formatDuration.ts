/** Formata uma duração em segundos como "4m 12s" ou "1h 02m 05s". */
export function formatDuration(seconds?: number | null): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return null;
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}

/**
 * Formata quanto tempo passou entre `fromISO` e `toISO` (default: agora)
 * em forma humana curta: "45m", "3h", "2d", "1d 4h".
 */
export function formatOpenFor(fromISO?: string | null, toISO?: string | null): string | null {
  if (!fromISO) return null;
  const from = new Date(fromISO).getTime();
  const to = toISO ? new Date(toISO).getTime() : Date.now();
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  const diff = Math.max(0, Math.floor((to - from) / 1000));
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return "agora";
}