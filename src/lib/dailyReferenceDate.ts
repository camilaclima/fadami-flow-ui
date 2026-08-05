// Data de referência da daily compartilhada entre dev e líder:
// antes das 17h => dia útil anterior; a partir das 17h => hoje.
export function isWorkday(d: Date): boolean {
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

export function previousBusinessDay(from: Date): Date {
  const previous = new Date(from);
  do {
    previous.setDate(previous.getDate() - 1);
  } while (!isWorkday(previous));
  return previous;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function currentDailyReferenceDate(now = new Date()): string {
  return toISODate(now.getHours() >= 17 ? now : previousBusinessDay(now));
}
