import { CheckCircle2, Ban, Clock, AlertTriangle, MessageSquarePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { differenceInCalendarDays } from "date-fns";

export type DevActivityKind = "done" | "inactive" | "pending";

interface Props {
  kind: DevActivityKind;
  description: string;
  cardCode?: string | null;
  createdAt?: string | null;
  devNotes?: string | null;
  editable?: boolean;
  onChangeNote?: (v: string) => void;
  rightSlot?: React.ReactNode;
}

export function DevActivityCard({
  kind,
  description,
  cardCode,
  createdAt,
  devNotes,
  editable,
  onChangeNote,
  rightSlot,
}: Props) {
  const hasNote = !!(devNotes && devNotes.trim().length > 0);
  const days = kind === "pending" && createdAt
    ? differenceInCalendarDays(new Date(), new Date(createdAt))
    : 0;
  const warn = kind === "pending" && days >= 2;

  return (
    <div
      className={`rounded-lg border p-2.5 bg-background flex items-start gap-2 ${
        kind === "inactive" ? "bg-muted/40" : ""
      } ${warn ? "border-orange-500/50" : ""}`}
    >
      {kind === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
      {kind === "inactive" && <Ban className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}
      {kind === "pending" && <Clock className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        {cardCode && cardCode.trim() && (
          <Badge variant="secondary" className="text-[10px] font-mono mb-1">
            #{cardCode.trim()}
          </Badge>
        )}
        <p className={`text-sm break-words whitespace-pre-wrap ${kind === "inactive" ? "text-muted-foreground line-through" : ""}`}>
          {description}
        </p>
        {kind === "inactive" && (
          <Badge variant="outline" className="text-[10px] mt-1">Inativada</Badge>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {warn && (
          <AlertTriangle
            className="w-4 h-4 text-orange-600"
            aria-label={`Pendente há ${days} dias`}
          />
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              title={hasNote ? "Ver observação do dev" : "Adicionar observação"}
              className={`h-7 w-7 rounded-lg relative ${
                hasNote
                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/40"
                  : "text-muted-foreground"
              }`}
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              {hasNote && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-80"
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block flex items-center gap-1">
              <MessageSquarePlus className="w-3 h-3" /> Observação do dev sobre esta demanda
            </Label>
            {editable ? (
              <Textarea
                rows={4}
                value={devNotes ?? ""}
                onChange={(e) => onChangeNote?.(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Contexto, dificuldades, decisões..."
                className="text-sm"
              />
            ) : hasNote ? (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{devNotes}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sem observação registrada.</p>
            )}
          </PopoverContent>
        </Popover>
        {rightSlot}
      </div>
    </div>
  );
}