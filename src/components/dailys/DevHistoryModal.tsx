import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Clock, Ban, History, MessageSquarePlus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDevDailyEntriesByUser } from "@/hooks/useDevDailyEntries";
import { useDevDailyActivitiesByUser } from "@/hooks/useDevDailyActivities";
import { useDevDailyImpedimentsByEntries, URGENCY_LABELS, URGENCY_STYLES } from "@/hooks/useDevDailyImpediments";
import { DevActivityCard } from "@/components/dailys/DevActivityCard";
import { useSquads } from "@/hooks/useSquads";
import { Users } from "lucide-react";
import { formatOpenFor } from "@/lib/formatDuration";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string | null;
  name: string;
}

export function DevHistoryModal({ open, onOpenChange, userId, name }: Props) {
  const { data: entries = [], isLoading } = useDevDailyEntriesByUser(open ? userId : null);
  const { data: activities = [] } = useDevDailyActivitiesByUser(open ? userId : null);
  const entryIds = useMemo(() => entries.map((e) => e.id), [entries]);
  const { data: impediments = [] } = useDevDailyImpedimentsByEntries(open ? entryIds : []);
  const { data: squads = [] } = useSquads();
  const squadNameById = useMemo(() => {
    const m = new Map<string, string>();
    (squads as any[]).forEach((s) => m.set(s.id, s.name));
    return m;
  }, [squads]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <History className="w-5 h-5 text-primary" /> Histórico de dailys — {name}
          </DialogTitle>
          <DialogDescription>Todos os registros do desenvolvedor. Clique para expandir.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="px-6 py-4 space-y-2">
            {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
            {!isLoading && entries.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
            )}
            {entries.map((e) => {
              // Impedimentos "vivos" (abertos) até o fim deste dia:
              // criados <= entry_date e ainda não sanados, ou sanados depois do entry_date.
              const dayEnd = `${e.entry_date}T23:59:59`;
              const openImps = impediments.filter((i) => {
                const createdDate = (i.created_at ?? "").slice(0, 10);
                if (!createdDate || createdDate > e.entry_date) return false;
                if (!i.resolved) return true;
                return !!i.resolved_at && i.resolved_at > dayEnd;
              });
              // Sanados neste dia (data de resolução == entry_date).
              const resolvedImps = impediments.filter((i) => {
                if (!i.resolved || !i.resolved_at) return false;
                return i.resolved_at.slice(0, 10) === e.entry_date;
              });
              // Detalhes exibidos ao expandir: impedimentos originados neste entry.
              const impsThisEntry = impediments.filter((i) => i.entry_id === e.id);
              const openImpsThisEntry = impsThisEntry.filter((i) => !i.resolved);
              const resolvedImpsThisEntry = impsThisEntry.filter((i) => i.resolved);
              const acts = activities.filter(
                (a) => a.created_entry_id === e.id || a.closed_entry_id === e.id,
              );
              const done = acts.filter((a) => a.status === "concluida" && a.closed_entry_id === e.id);
              const inactive = acts.filter((a) => a.status === "inativa" && a.closed_entry_id === e.id);
              const pending = acts.filter((a) => a.status === "pendente" && a.created_entry_id === e.id);
              const isOpen = expanded[e.id] ?? false;
              let dateLabel = e.entry_date;
              try {
                dateLabel = format(parseISO(e.entry_date), "dd 'de' MMMM 'de' yyyy (EEEE)", { locale: ptBR });
              } catch {}
              return (
                <div key={e.id} className="rounded-lg border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggle(e.id)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/40 transition-colors"
                  >
                    <div className="text-muted-foreground">
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold capitalize truncate">{dateLabel}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant="outline"
                        className="text-[10px] gap-1 border-primary/30 text-primary bg-primary/5"
                      >
                        <Users className="w-2.5 h-2.5" />
                        {e.squad_id ? (squadNameById.get(e.squad_id) ?? "Squad") : "Sem squad"}
                      </Badge>
                      {openImps.length > 0 && (
                        <Badge variant="outline" className="text-[10px] gap-1 bg-orange-500/10 text-orange-600 border-orange-500/30">
                          <AlertTriangle className="w-2.5 h-2.5" /> {openImps.length} aberto{openImps.length > 1 ? "s" : ""}
                        </Badge>
                      )}
                      {resolvedImps.length > 0 && (
                        <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                          <CheckCircle2 className="w-2.5 h-2.5" /> {resolvedImps.length} sanado{resolvedImps.length > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 pt-1 border-t bg-background/40 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="rounded-lg bg-muted/40 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1">Ontem</p>
                          {done.length + inactive.length > 0 ? (
                            <div className="space-y-1.5">
                              {done.map((a) => (
                                <DevActivityCard key={a.id} kind="done" description={a.description} createdAt={a.created_at} devNotes={a.dev_notes} />
                              ))}
                              {inactive.map((a) => (
                                <DevActivityCard key={a.id} kind="inactive" description={a.description} createdAt={a.created_at} devNotes={a.dev_notes} />
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs whitespace-pre-wrap break-words">{e.did_yesterday || "—"}</p>
                          )}
                        </div>
                        <div className="rounded-lg bg-primary/5 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wide font-semibold text-primary/80 mb-1">Hoje</p>
                          {pending.length > 0 ? (
                            <div className="space-y-1.5">
                              {pending.map((a) => (
                                <DevActivityCard key={a.id} kind="pending" description={a.description} createdAt={a.created_at} devNotes={a.dev_notes} />
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs whitespace-pre-wrap break-words">{e.will_do_today || "—"}</p>
                          )}
                        </div>
                      </div>
                      <div className="rounded-lg border bg-muted/20 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                          <MessageSquarePlus className="w-3 h-3" /> Observações gerais do dev
                        </p>
                        {e.general_notes?.trim() ? (
                          <p className="text-xs whitespace-pre-wrap break-words">{e.general_notes}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Nenhuma observação geral registrada.</p>
                        )}
                      </div>
                      {openImpsThisEntry.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] uppercase tracking-wide font-semibold text-orange-600">Impedimentos abertos</p>
                          {openImpsThisEntry.map((imp) => (
                            <div key={imp.id} className="flex items-start gap-2 p-2 rounded-lg bg-orange-500/5 border border-orange-500/20">
                              <AlertTriangle className="w-3.5 h-3.5 text-orange-600 mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs whitespace-pre-wrap break-words">{imp.description}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <Badge variant="outline" className={`text-[10px] ${URGENCY_STYLES[imp.urgency]}`}>{URGENCY_LABELS[imp.urgency]}</Badge>
                                  {imp.created_at && (
                                    <span className="text-[10px] text-orange-700/80 dark:text-orange-400/80 inline-flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5" /> Aberto há {formatOpenFor(imp.created_at)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {resolvedImpsThisEntry.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] uppercase tracking-wide font-semibold text-emerald-600">Impedimentos sanados</p>
                          {resolvedImpsThisEntry.map((imp) => (
                            <div key={imp.id} className="flex items-start gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs whitespace-pre-wrap break-words">{imp.description}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className={`text-[10px] ${URGENCY_STYLES[imp.urgency]}`}>{URGENCY_LABELS[imp.urgency]}</Badge>
                                  {imp.created_at && imp.resolved_at && (
                                    <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 inline-flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5" /> Ficou aberto por {formatOpenFor(imp.created_at, imp.resolved_at)}
                                    </span>
                                  )}
                                  {imp.resolved_at && (
                                    <span className="text-[10px] text-muted-foreground">Sanado {format(new Date(imp.resolved_at), "dd/MM HH:mm")}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <div className="px-6 py-3 border-t flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}