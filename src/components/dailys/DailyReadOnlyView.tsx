import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  FileText, ChevronDown, ChevronRight, UserCheck, CalendarX, UserMinus, Video, VideoOff,
  MessageSquarePlus, AlertTriangle, CheckCircle2, Clock, Ban, History, Paperclip, UserX,
} from "lucide-react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { URGENCY_LABELS, URGENCY_STYLES } from "@/hooks/useDevDailyImpediments";
import { DevHistoryModal } from "@/components/dailys/DevHistoryModal";
import type { DevDailyActivity } from "@/hooks/useDevDailyActivities";

interface EntryLike {
  id: string;
  user_id: string;
  did_yesterday: string | null;
  will_do_today: string | null;
  created_at?: string;
}
interface AttendanceLike {
  id: string;
  camera_on: boolean;
  notes: string | null;
  absent_from_work: boolean | null;
  did_not_participate: boolean | null;
  non_participation_reason: string | null;
  dev_entry_id: string | null;
  member_user_id: string | null;
}
interface ImpedimentLike {
  id: string;
  entry_id: string;
  description: string;
  urgency: string;
  resolved: boolean;
  resolved_at?: string | null;
}
interface MeetingLike {
  id: string;
  squad_id: string | null;
  observations: string | null;
  transcript_url: string | null;
}

interface Props {
  date: string;
  entries: EntryLike[];
  meetings: MeetingLike[];
  attByEntry: Map<string, AttendanceLike[]>;
  attByUser: Map<string, AttendanceLike[]>;
  impsByEntry: Map<string, ImpedimentLike[]>;
  activitiesByEntry: {
    done: Map<string, DevDailyActivity[]>;
    inactive: Map<string, DevDailyActivity[]>;
    planned: Map<string, DevDailyActivity[]>;
  };
  nameFor: (uid: string) => string;
  squadNameById: Map<string, string>;
}

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "?";

export function DailyReadOnlyView({
  date, entries, meetings, attByEntry, attByUser, impsByEntry, activitiesByEntry, nameFor, squadNameById,
}: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));
  const [historyFor, setHistoryFor] = useState<{ userId: string; name: string } | null>(null);

  const rows = useMemo(() => entries.map((e) => {
    const atts = (attByEntry.get(e.id) ?? []).concat(
      (attByUser.get(e.user_id) ?? []).filter((a) => !a.dev_entry_id),
    );
    const att = atts[0] ?? null;
    return { entry: e, atts, att, name: nameFor(e.user_id) };
  }), [entries, attByEntry, attByUser, nameFor]);

  const stats = useMemo(() => {
    let present = 0, absent = 0, noPart = 0, cam = 0;
    rows.forEach(({ att }) => {
      if (att?.absent_from_work) absent++;
      else if (att?.did_not_participate) noPart++;
      else { present++; if (att?.camera_on) cam++; }
    });
    return { total: rows.length, present, absent, noPart, cam };
  }, [rows]);

  const dateObj = (() => { try { return parseISO(date); } catch { return new Date(date); } })();

  return (
    <>
    <div className="space-y-4">
      {/* Header stats */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className="rounded-lg gap-1 font-normal">
          <span className="text-muted-foreground">Presença</span>
          <span className="font-semibold text-foreground">{stats.present}/{stats.total}</span>
        </Badge>
        {stats.absent > 0 && (
          <Badge variant="outline" className="rounded-lg gap-1 font-normal border-red-500/40 text-red-600 bg-red-500/5">
            <CalendarX className="w-3 h-3" /><span className="font-semibold">{stats.absent}</span>
          </Badge>
        )}
        {stats.noPart > 0 && (
          <Badge variant="outline" className="rounded-lg gap-1 font-normal border-amber-500/40 text-amber-700 bg-amber-500/5">
            <UserMinus className="w-3 h-3" /><span className="font-semibold">{stats.noPart}</span>
          </Badge>
        )}
        <Badge variant="outline" className="rounded-lg gap-1 font-normal">
          <Video className="w-3 h-3" /><span className="font-semibold">{stats.cam}/{stats.total}</span>
        </Badge>
      </div>

      {/* Colaboradores */}
      <div className="space-y-2">
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum registro para este dia.</p>
        )}
        {rows.map(({ entry: e, atts, att, name }) => {
          const isAbsent = !!att?.absent_from_work;
          const isNoPart = !!att?.did_not_participate;
          const isPresent = !isAbsent && !isNoPart;
          const imps = impsByEntry.get(e.id) ?? [];
          const openImps = imps.filter((i) => !i.resolved);
          const resolvedImps = imps.filter((i) => i.resolved);
          const noteText = atts.filter((a) => a.notes?.trim()).map((a) => a.notes!.trim()).join("\n\n");
          const hasNote = noteText.length > 0;
          const isOpen = expanded[e.id] ?? false;
          const done = activitiesByEntry.done.get(e.id) ?? [];
          const inactive = activitiesByEntry.inactive.get(e.id) ?? [];
          const planned = activitiesByEntry.planned.get(e.id) ?? [];
          const today = new Date();

          return (
            <Card
              key={e.id}
              className={`rounded-xl overflow-hidden transition-all ${
                isAbsent ? "border-red-500/40 bg-red-500/[0.03]"
                : isNoPart ? "border-amber-500/40 bg-amber-500/[0.03]"
                : "border-border/70"
              } ${openImps.length > 0 && isPresent ? "border-l-4 border-l-orange-500" : ""}`}
            >
              <CardContent className="p-0">
                <button
                  type="button"
                  onClick={() => toggle(e.id)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="text-muted-foreground shrink-0">
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                    isAbsent ? "bg-red-500/10 text-red-600"
                    : isNoPart ? "bg-amber-500/10 text-amber-700"
                    : "bg-primary/10 text-primary"
                  }`}>{initialsOf(name)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm leading-tight">{name}</span>
                      {isPresent && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                          <UserCheck className="w-2.5 h-2.5" /> Presente
                        </Badge>
                      )}
                      {isAbsent && (
                        <Badge variant="outline" className="text-[10px] border-red-500/40 text-red-600 bg-red-500/5 gap-1">
                          <CalendarX className="w-2.5 h-2.5" /> Ausente
                        </Badge>
                      )}
                      {isNoPart && (
                        <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 bg-amber-500/5 gap-1">
                          <UserMinus className="w-2.5 h-2.5" /> Não participou
                        </Badge>
                      )}
                      {!att && (
                        <Badge variant="outline" className="text-[10px] gap-1 border-border/60 text-muted-foreground">
                          <UserX className="w-2.5 h-2.5" /> Sem registro de presença
                        </Badge>
                      )}
                      {isPresent && openImps.length > 0 && (
                        <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/30 gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {openImps.length} {openImps.length > 1 ? "impedimentos" : "impedimento"}
                        </Badge>
                      )}
                    </div>
                    {isNoPart && att?.non_participation_reason?.trim() && !isOpen && (
                      <p className="text-[11px] text-amber-700/90 mt-1 truncate">
                        Motivo: {att.non_participation_reason}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isPresent && att && (
                      <div className={`h-8 w-8 rounded-lg border flex items-center justify-center ${
                        att.camera_on ? "bg-primary/10 text-primary border-primary/40" : "text-muted-foreground"
                      }`} title={att.camera_on ? "Câmera ligada" : "Câmera desligada"}>
                        {att.camera_on ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                      </div>
                    )}
                    {hasNote && (
                      <div className="h-8 w-8 rounded-lg border bg-primary/10 text-primary border-primary/40 flex items-center justify-center relative" title="Observação do líder">
                        <MessageSquarePlus className="w-3.5 h-3.5" />
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
                      </div>
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-3 pb-3 pt-1 space-y-3 border-t bg-background/40">
                    {isNoPart && att?.non_participation_reason?.trim() && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wide font-semibold text-amber-700 mb-1">
                          Motivo da não participação
                        </p>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed border-l-2 border-amber-500/40 pl-2">
                          {att.non_participation_reason}
                        </p>
                      </div>
                    )}

                    {isPresent && (
                      <>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 rounded-lg gap-1 text-xs"
                            onClick={() => setHistoryFor({ userId: e.user_id, name })}
                          >
                            <History className="w-3 h-3" /> Ver histórico do dev
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="rounded-lg bg-muted/40 px-3 py-2">
                            <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1">Ontem</p>
                            {done.length + inactive.length > 0 ? (
                              <ul className="space-y-1">
                                {done.map((a) => (
                                  <li key={a.id} className="flex items-start gap-1.5 text-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                    <span className="break-words">{a.description}</span>
                                  </li>
                                ))}
                                {inactive.map((a) => (
                                  <li key={a.id} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                    <Ban className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                    <span className="break-words"><span className="line-through">{a.description}</span> — inativada</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words">{e.did_yesterday || "—"}</p>
                            )}
                          </div>
                          <div className="rounded-lg bg-primary/5 px-3 py-2">
                            <p className="text-[10px] uppercase tracking-wide font-semibold text-primary/80 mb-1">Hoje</p>
                            {planned.length > 0 ? (
                              <ul className="space-y-1">
                                {planned.map((a) => {
                                  const days = a.created_at ? differenceInCalendarDays(today, new Date(a.created_at)) : 0;
                                  const warn = days >= 2;
                                  return (
                                    <li key={a.id} className="flex items-start gap-1.5 text-xs">
                                      <Clock className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" />
                                      <span className="break-words flex-1">{a.description}</span>
                                      {warn && (
                                        <AlertTriangle className="w-3.5 h-3.5 text-orange-600 mt-0.5 shrink-0" aria-label={`Pendente há ${days} dias`} />
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : (
                              <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words">{e.will_do_today || "—"}</p>
                            )}
                          </div>
                        </div>

                        {openImps.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] uppercase tracking-wide font-semibold text-orange-600">Impedimentos abertos</p>
                            {openImps.map((imp) => (
                              <div key={imp.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-orange-500/5 border border-orange-500/20">
                                <AlertTriangle className="w-3.5 h-3.5 text-orange-600 mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs whitespace-pre-wrap break-words text-foreground/90">{imp.description}</p>
                                  <Badge variant="outline" className={`text-[10px] mt-1 ${URGENCY_STYLES[imp.urgency as keyof typeof URGENCY_STYLES]}`}>
                                    {URGENCY_LABELS[imp.urgency as keyof typeof URGENCY_LABELS]}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {resolvedImps.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] uppercase tracking-wide font-semibold text-emerald-600">Impedimentos sanados</p>
                            {resolvedImps.map((imp) => (
                              <div key={imp.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs whitespace-pre-wrap break-words text-foreground/90">{imp.description}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className={`text-[10px] ${URGENCY_STYLES[imp.urgency as keyof typeof URGENCY_STYLES]}`}>
                                      {URGENCY_LABELS[imp.urgency as keyof typeof URGENCY_LABELS]}
                                    </Badge>
                                    {imp.resolved_at && (
                                      <span className="text-[10px] text-muted-foreground">
                                        Sanado {format(new Date(imp.resolved_at), "dd/MM HH:mm")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {hasNote && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                          <MessageSquarePlus className="w-3 h-3" /> Observação do líder sobre {name.split(" ")[0]}
                        </p>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed border-l-2 border-amber-500/40 pl-2">
                          {noteText}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Observações gerais + anexo */}
      {meetings.length > 0 && (
        <div className="space-y-3">
          {meetings.map((mt) => {
            const sq = mt.squad_id ? squadNameById.get(mt.squad_id) ?? "Squad" : "Sem squad";
            return (
              <div key={mt.id} className="rounded-xl border p-4 bg-muted/20">
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                    Observações da reunião — {sq}
                  </p>
                  {mt.transcript_url && (
                    <a
                      href={mt.transcript_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs rounded-lg bg-background border px-2 py-1 hover:bg-muted transition-colors"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-primary" />
                      <span className="text-primary underline">Ver transcrição</span>
                    </a>
                  )}
                </div>
                {mt.observations?.trim() ? (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{mt.observations}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Sem observações gerais.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
    <DevHistoryModal
      open={!!historyFor}
      onOpenChange={(v) => { if (!v) setHistoryFor(null); }}
      userId={historyFor?.userId ?? null}
      name={historyFor?.name ?? ""}
    />
    </>
  );
}