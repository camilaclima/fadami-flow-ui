import { DevActivityCard } from "@/components/dailys/DevActivityCard";

export function splitFreeText(text: string): string[] {
  return text
    .split(/\r?\n+/)
    .map((l) => l.replace(/^\s*(?:[-*•○●◦▪▫»·]|\d+[.)])\s*/, "").trim())
    .filter((l) => l.length > 0);
}

interface FreeTextActivityListProps {
  text: string | null | undefined;
  kind: "done" | "pending";
  createdAt?: string | null;
  emptyFallback?: React.ReactNode;
  keyPrefix?: string;
}

export function FreeTextActivityList({
  text,
  kind,
  createdAt,
  emptyFallback,
  keyPrefix = "ft",
}: FreeTextActivityListProps) {
  const lines = text?.trim() ? splitFreeText(text) : [];
  if (lines.length === 0) {
    return <>{emptyFallback ?? <p className="text-xs text-muted-foreground italic">—</p>}</>;
  }
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => (
        <DevActivityCard
          key={`${keyPrefix}-${i}`}
          kind={kind}
          description={line}
          createdAt={createdAt ?? undefined}
        />
      ))}
    </div>
  );
}