import { useEffect, useState } from "react";
import { Check, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MANUAL_TAG_OPTIONS,
  type ManualTag,
} from "@/lib/executiveReportRules";
import {
  useDailyEntryTagsByEntries,
  useUpsertDailyEntryTags,
} from "@/hooks/useDailyEntryTags";

interface Props {
  entryId: string;
  compact?: boolean;
}

export function DailyEntryTagsSelector({ entryId, compact }: Props) {
  const { data: rows = [] } = useDailyEntryTagsByEntries([entryId]);
  const current = rows.find((r) => r.entry_id === entryId);
  const upsert = useUpsertDailyEntryTags();
  const [selected, setSelected] = useState<ManualTag[]>([]);

  useEffect(() => {
    setSelected((current?.tags ?? []) as ManualTag[]);
  }, [current?.id, current?.tags?.join("|")]);

  const toggle = (t: ManualTag) => {
    const next = selected.includes(t)
      ? selected.filter((x) => x !== t)
      : [...selected, t];
    setSelected(next);
    upsert.mutate({ entry_id: entryId, tags: next, notes: current?.notes ?? null });
  };

  return (
    <div className={compact ? "flex items-center gap-1.5 flex-wrap" : "flex items-center gap-2 flex-wrap"}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="rounded-lg gap-1.5 h-7 text-xs"
          >
            <Tags className="w-3.5 h-3.5" />
            Marcar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs">Marcações do Admin</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {MANUAL_TAG_OPTIONS.map((opt) => {
            const active = selected.includes(opt.value);
            return (
              <DropdownMenuItem
                key={opt.value}
                onSelect={(e) => {
                  e.preventDefault();
                  toggle(opt.value);
                }}
                className="text-xs gap-2 cursor-pointer"
              >
                <span className="w-4 h-4 inline-flex items-center justify-center">
                  {active && <Check className="w-3.5 h-3.5 text-primary" />}
                </span>
                <span className="flex-1">{opt.label}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {selected.map((t) => {
        const opt = MANUAL_TAG_OPTIONS.find((o) => o.value === t);
        if (!opt) return null;
        return (
          <Badge
            key={t}
            variant="outline"
            className="text-[10px] bg-primary/10 text-primary border-primary/30"
          >
            {opt.label}
          </Badge>
        );
      })}
    </div>
  );
}