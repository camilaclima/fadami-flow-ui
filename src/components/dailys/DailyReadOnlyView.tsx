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
import { DevActivityCard } from "@/components/dailys/DevActivityCard";
import type { DevDailyActivity } from "@/hooks/useDevDailyActivities";

interface EntryLike {
  id: string;
  user_id: string;
  did_yesterday: string | null;
  will_do_today: string | null;
  general_notes?: string | null;
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
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggle(e.id)}
                  onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); toggle(e.id); } }}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors cursor-pointer"
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
                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {att && (
                      <ToggleGroup
                        type="single"
                        value={isAbsent ? "absent_work" : isNoPart ? "no_participate" : "present"}
                        className="rounded-lg border bg-background p-0.5 pointer-events-none"
                      >
                        <ToggleGroupItem
                          value="present"
                          size="sm"
                          disabled
                          title="Presente"
                          className="h-7 px-2 gap-1 text-xs data-[state=on]:bg-emerald-500/10 data-[state=on]:text-emerald-700 disabled:opacity-100"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </ToggleGroupItem>
                        <ToggleGroupItem
                          value="absent_work"
                          size="sm"
                          disabled
                          title="Ausente do trabalho"
                          className="h-7 px-2 gap-1 text-xs data-[state=on]:bg-red-500/10 data-[state=on]:text-red-600 disabled:opacity-100"
                        >
                          <CalendarX className="w-3.5 h-3.5" />
                        </ToggleGroupItem>
                        <ToggleGroupItem
                          value="no_participate"
                          size="sm"
                          disabled
                          title="Não participou da daily"
                          className="h-7 px-2 gap-1 text-xs data-[state=on]:bg-amber-500/10 data-[state=on]:text-amber-700 disabled:opacity-100"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </ToggleGroupItem>
                      </ToggleGroup>
                    )}
                    {att && isPresent && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled
                        title={att.camera_on ? "Câmera ligada" : "Câmera desligada"}
                        className={`h-8 w-8 rounded-lg disabled:opacity-100 ${
                          att.camera_on
                            ? "bg-primary/10 text-primary border-primary/40"
                            : "text-muted-foreground"
                        }`}
                      >
                        {att.camera_on ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                      </Button>
                    )}
                    {att && (
                      hasNote ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              title="Observação do líder"
                              className="h-8 w-8 rounded-lg relative bg-primary/10 text-primary border-primary/40"
                            >
                              <MessageSquarePlus className="w-3.5 h-3.5" />
                              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-80">
                            <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block flex items-center gap-1">
                              <MessageSquarePlus className="w-3 h-3" /> Observação sobre {name.split(" ")[0]}
                            </Label>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{noteText}</p>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled
                          title="Sem observação"
                          className="h-8 w-8 rounded-lg text-muted-foreground disabled:opacity-100"
                        >
                          <MessageSquarePlus className="w-3.5 h-3.5" />
                        </Button>
                      )
                    )}
                  </div>
                </div>

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
                              <div className="space-y-1.5">
                                {done.map((a) => (
                                  <DevActivityCard key={a.id} kind="done" description={a.description} createdAt={a.created_at} devNotes={a.dev_notes} />
                                ))}
                                {inactive.map((a) => (
                                  <DevActivityCard key={a.id} kind="inactive" description={a.description} createdAt={a.created_at} devNotes={a.dev_notes} />
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words">{e.did_yesterday || "—"}</p>
                            )}
                          </div>
                          <div className="rounded-lg bg-primary/5 px-3 py-2">
                            <p className="text-[10px] uppercase tracking-wide font-semibold text-primary/80 mb-1">Hoje</p>
                            {planned.length > 0 ? (
                              <div className="space-y-1.5">
                                {planned.map((a) => (
                                  <DevActivityCard key={a.id} kind="pending" description={a.description} createdAt={a.created_at} devNotes={a.dev_notes} />
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words">{e.will_do_today || "—"}</p>
                            )}
                          </div>
                        </div>
                        <div className="rounded-lg border bg-muted/20 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                            <MessageSquarePlus className="w-3 h-3" /> Observações gerais do dev
                          </p>
                          {e.general_notes?.trim() ? (
                            <p className="text-xs whitespace-pre-wrap break-words text-foreground/90">{e.general_notes}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">Nenhuma observação geral registrada.</p>
                          )}
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
      <div className="space-y-3">
        {(meetings.length > 0 ? meetings : [null]).map((mt, idx) => {
          const sq = mt?.squad_id ? squadNameById.get(mt.squad_id) ?? "Squad" : null;
          const hasAttachment = !!mt?.transcript_url;
          return (
            <div key={mt?.id ?? `empty-${idx}`} className="rounded-xl border p-4 bg-muted/20">
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                  Observações da reunião{sq ? ` — ${sq}` : ""}
                </p>
                {hasAttachment ? (
                  <a
                    href={mt!.transcript_url!}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs rounded-lg border px-2 py-1 border-emerald-500/40 text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span className="underline">Ver transcrição</span>
                  </a>
                ) : (
                  <span
                    aria-disabled="true"
                    title="Sem transcrição anexada"
                    className="flex items-center gap-1.5 text-xs rounded-lg border px-2 py-1 border-border bg-muted/40 text-muted-foreground opacity-70 cursor-not-allowed select-none"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Sem transcrição</span>
                  </span>
                )}
              </div>
              {mt?.observations?.trim() ? (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{mt.observations}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Não houve registro de observações.</p>
              )}
            </div>
          );
        })}
      </div>
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