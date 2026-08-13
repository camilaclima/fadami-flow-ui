import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSquads } from "@/hooks/useSquads";
import { useDevDailyEntriesByDate } from "@/hooks/useDevDailyEntries";
import { useDevDailyActivitiesByEntries } from "@/hooks/useDevDailyActivities";

import { currentDailyReferenceDate, previousBusinessDay, toISODate } from "@/lib/dailyReferenceDate";
import { splitFreeText } from "@/lib/dailyFreeText";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CalendarDays, Camera, Mail, Send, Users2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const WINDOW_DAYS = 10; // janela de dias úteis usada nos indicadores

function lastBusinessDays(from: string, count: number): string[] {
  const out: string[] = [];
  let cursor = new Date(`${from}T12:00:00`);
  out.push(toISODate(cursor));
  while (out.length < count) {
    cursor = previousBusinessDay(cursor);
    out.push(toISODate(cursor));
  }
  return out;
}

function pct(n: number, d: number) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

function formatLongDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

interface MemberRow {
  user_id: string | null;
  name: string;
  email: string | null;
}

export default function ResumoEmailPage() {
  const { data: squads = [] } = useSquads();
  const activeSquads = useMemo(() => squads.filter((s: any) => s.active !== false), [squads]);
  const [squadId, setSquadId] = useState<string | null>(null);
  const [date, setDate] = useState<string>(() => currentDailyReferenceDate());

  const effectiveSquadId = squadId ?? activeSquads[0]?.id ?? null;
  const squad = activeSquads.find((s: any) => s.id === effectiveSquadId);
  const dayWindow = useMemo(() => lastBusinessDays(date, WINDOW_DAYS), [date]);

  // Membros da squad
  const { data: members = [] } = useQuery({
    queryKey: ["resumo_email", "members", effectiveSquadId ?? "none"],
    enabled: !!effectiveSquadId,
    queryFn: async () => {
      const { data: sm } = await (supabase.from("squad_members") as any)
        .select("team_member_id").eq("squad_id", effectiveSquadId);
      const tmIds = (sm ?? []).map((r: any) => r.team_member_id);
      if (tmIds.length === 0) return [] as MemberRow[];
      const { data: tms } = await (supabase.from("team_members") as any)
        .select("id,email,name").in("id", tmIds);
      const { data: profs } = await (supabase.from("profiles") as any)
        .select("user_id,email,first_name,last_name");
      const byEmail = new Map<string, any>();
      const byName = new Map<string, any>();
      (profs ?? []).forEach((p: any) => {
        const em = String(p.email ?? "").trim().toLowerCase();
        const full = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim().toLowerCase();
        if (em) byEmail.set(em, p);
        if (full) byName.set(full, p);
      });
      const mapped: MemberRow[] = (tms ?? []).map((t: any) => {
        const em = String(t.email ?? "").trim().toLowerCase();
        const nm = String(t.name ?? "").trim().toLowerCase();
        const p = (em && byEmail.get(em)) || (nm && byName.get(nm)) || null;
        return { user_id: p?.user_id ?? null, name: t.name as string, email: (t.email ?? null) as string | null };
      });
      const dedup = new Map<string, MemberRow>();
      mapped.forEach((m) => {
        const k = String(m.name ?? "").trim().toLowerCase();
        const prev = dedup.get(k);
        if (!prev || (!prev.user_id && m.user_id)) dedup.set(k, m);
      });
      return Array.from(dedup.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  const { data: entries = [], isLoading } = useDevDailyEntriesByDate(date, effectiveSquadId);
  const entryIds = useMemo(() => entries.map((e: any) => e.id), [entries]);
  const { data: activities = [] } = useDevDailyActivitiesByEntries(entryIds);

  // Histórico de impedimentos da squad (abertos até a data e sanados)
  const { data: impHistory } = useQuery({
    queryKey: ["resumo_email", "impediments", effectiveSquadId ?? "none", date],
    enabled: !!effectiveSquadId,
    queryFn: async () => {
      const from = toISODate(new Date(new Date(`${date}T12:00:00`).getTime() - 90 * 86400000));
      const { data: ents } = await (supabase.from("dev_daily_entries") as any)
        .select("id,user_id,entry_date")
        .eq("squad_id", effectiveSquadId)
        .gte("entry_date", from)
        .lte("entry_date", date);
      const ids = (ents ?? []).map((e: any) => e.id);
      if (ids.length === 0) return { byUser: new Map<string, any[]>() };
      const { data: imps } = await (supabase.from("dev_daily_impediments") as any)
        .select("*")
        .in("entry_id", ids)
        .order("created_at", { ascending: true });
      const userByEntry = new Map<string, string>();
      const dateByEntry = new Map<string, string>();
      (ents ?? []).forEach((e: any) => {
        userByEntry.set(e.id, e.user_id);
        dateByEntry.set(e.id, e.entry_date);
      });
      const byUser = new Map<string, any[]>();
      (imps ?? []).forEach((i: any) => {
        const uid = userByEntry.get(i.entry_id);
        if (!uid) return;
        const resolvedDay = i.resolved_at ? String(i.resolved_at).slice(0, 10) : null;
        // Ainda aberto na data consultada?
        const openOnDate = !i.resolved || (resolvedDay ? resolvedDay > date : false);
        const item = {
          ...i,
          entry_date: dateByEntry.get(i.entry_id) ?? null,
          resolvedDay,
          state: openOnDate ? "aberto" : "sanado",
        };
        const arr = byUser.get(uid) ?? [];
        arr.push(item);
        byUser.set(uid, arr);
      });
      return { byUser };
    },
  });

  // Encontros + presença na janela (para faltas / câmeras)
  const { data: windowData } = useQuery({
    queryKey: ["resumo_email", "window", effectiveSquadId ?? "none", date],
    enabled: !!effectiveSquadId,
    queryFn: async () => {
      const from = dayWindow[dayWindow.length - 1];
      const { data: meetings } = await (supabase.from("daily_meetings") as any)
        .select("id,meeting_date").eq("squad_id", effectiveSquadId)
        .gte("meeting_date", from).lte("meeting_date", date);
      const meetingIds = (meetings ?? []).map((m: any) => m.id);
      const { data: attendance } = meetingIds.length
        ? await (supabase.from("daily_meeting_attendance") as any)
            .select("*").in("meeting_id", meetingIds)
        : { data: [] };
      const { data: winEntries } = await (supabase.from("dev_daily_entries") as any)
        .select("id,user_id,entry_date").eq("squad_id", effectiveSquadId)
        .gte("entry_date", from).lte("entry_date", date);
      return {
        meetings: (meetings ?? []) as any[],
        attendance: (attendance ?? []) as any[],
        winEntries: (winEntries ?? []) as any[],
      };
    },
  });

  const meetingsCount = windowData?.meetings.length ?? 0;
  const daysCount = dayWindow.length;

  const rows = useMemo(() => {
    return members.map((m) => {
      const entry = entries.find((e: any) => e.user_id === m.user_id);
      // Atividades planejadas para hoje: pendentes criadas neste registro.
      const planned = entry
        ? activities
            .filter((a: any) => a.created_entry_id === entry.id && a.status === "pendente")
            .map((a: any) => ({ text: a.description as string, card: a.card_code as string | null }))
        : [];
      const fallback = entry && planned.length === 0
        ? splitFreeText(entry.will_do_today ?? "").map((t) => ({ text: t, card: null }))
        : [];
      const plannedList = planned.length ? planned : fallback;

      const all = (m.user_id ? impHistory?.byUser.get(m.user_id) : null) ?? [];
      const abertos = all.filter((i: any) => i.state === "aberto");
      const sanados = all.filter((i: any) => i.state === "sanado" && i.resolvedDay === date);

      const att = (windowData?.attendance ?? []).filter(
        (a: any) =>
          (m.user_id && a.member_user_id === m.user_id) ||
          (!a.member_user_id && String(a.member_name ?? "").trim().toLowerCase() === m.name.trim().toLowerCase())
      );
      const absences = att.filter((a: any) => a.absent_from_work).length;
      const cameras = att.filter((a: any) => a.camera_on).length;
      const registros = (windowData?.winEntries ?? []).filter((e: any) => e.user_id === m.user_id).length;

      return {
        member: m,
        entry,
        plannedList,
        impediments: abertos,
        impedimentsResolved: sanados,
        faltasPct: pct(absences, meetingsCount || att.length || 0),
        registrosPct: pct(registros, daysCount),
        cameraPct: pct(cameras, att.length),
      };
    });
  }, [members, entries, activities, impHistory, windowData, meetingsCount, daysCount]);

  const totals = useMemo(() => {
    const filled = rows.filter((r) => !!r.entry).length;
    const imps = rows.reduce((acc, r) => acc + r.impediments.length, 0);
    const avg = (key: "faltasPct" | "registrosPct" | "cameraPct") =>
      rows.length ? Math.round(rows.reduce((a, r) => a + r[key], 0) / rows.length) : 0;
    return {
      filled,
      total: rows.length,
      imps,
      faltas: avg("faltasPct"),
      registros: avg("registrosPct"),
      cameras: avg("cameraPct"),
    };
  }, [rows]);

  return (
    <div className="w-full max-w-[1100px] mx-auto p-4 md:p-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Mail className="w-4 h-4" />
            <span className="text-[11px] font-semibold uppercase tracking-widest">Protótipo</span>
          </div>
          <h1 className="text-2xl font-bold">Resumo por E-mail</h1>
          <p className="text-sm text-muted-foreground">
            Prévia do e-mail automático com o resumo da daily da squad.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={effectiveSquadId ?? undefined} onValueChange={(v) => setSquadId(v)}>
            <SelectTrigger className="w-[220px] rounded-xl">
              <SelectValue placeholder="Selecione a squad" />
            </SelectTrigger>
            <SelectContent>
              {activeSquads.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
          />
          <Button
            className="rounded-xl gap-2"
            onClick={() => toast.info("Protótipo: o envio automático ainda não está ativo.")}
          >
            <Send className="w-4 h-4" /> Enviar teste
          </Button>
        </div>
      </header>

      {/* Prévia do e-mail */}
      <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="px-6 md:px-10 py-8 border-b border-border/60 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent">
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold">Fadami Flow · Resumo da Daily</p>
          <h2 className="text-xl md:text-2xl font-bold mt-2">{squad?.name ?? "—"}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1 capitalize">
            <CalendarDays className="w-3.5 h-3.5" /> {formatLongDate(date)}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 md:px-10 md:py-6 border-b border-border/60">
          {[
            { label: "Registros da daily", value: `${totals.filled}/${totals.total}`, sub: `${totals.registros}% na janela`, icon: CheckCircle2, tone: "emerald" },
            { label: "Impedimentos abertos", value: String(totals.imps), sub: "na data consultada", icon: AlertTriangle, tone: "amber" },
            { label: "Faltas", value: `${totals.faltas}%`, sub: `últimos ${daysCount} dias úteis`, icon: Users2, tone: "rose" },
            { label: "Câmeras ativas", value: `${totals.cameras}%`, sub: `últimos ${daysCount} dias úteis`, icon: Camera, tone: "sky" },
          ].map((k) => {
            const tones: Record<string, string> = {
              emerald: "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400",
              amber: "bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400",
              rose: "bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400",
              sky: "bg-sky-500/10 border-sky-500/25 text-sky-600 dark:text-sky-400",
            };
            return (
              <div key={k.label} className={`rounded-2xl border px-4 py-4 ${tones[k.tone]}`}>
                <div className="flex items-center gap-2">
                  <k.icon className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase tracking-wider font-semibold">{k.label}</span>
                </div>
                <p className="text-2xl font-bold mt-2 text-foreground">{k.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</p>
              </div>
            );
          })}
        </div>

        <div className="p-6 md:p-10 space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {!isLoading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum colaborador vinculado a esta squad.</p>
          )}
          {rows.map((r) => (
            <article key={r.member.name} className="rounded-2xl border border-border/70 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-surface-hover/50 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
                    {r.member.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold leading-tight">{r.member.name}</h3>
                    <p className="text-xs text-muted-foreground">{r.member.email ?? "sem e-mail"}</p>
                  </div>
                </div>
                {r.entry ? (
                  <Badge className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/15">
                    Registrou
                  </Badge>
                ) : (
                  <Badge variant="outline" className="rounded-full text-muted-foreground">Sem registro</Badge>
                )}
              </div>

              <div className="p-5 space-y-5">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-primary font-semibold mb-2">
                    Planejado para hoje · {r.plannedList.length}
                  </p>
                  {r.plannedList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nada planejado registrado.</p>
                  ) : (
                    <div className="space-y-2">
                      {r.plannedList.map((a, i) => (
                        <div
                          key={i}
                          className="rounded-xl border border-primary/20 bg-primary/[0.06] px-3.5 py-2.5 text-sm flex gap-3"
                        >
                          <span className="text-[11px] font-bold text-primary/70 mt-0.5 w-4 flex-shrink-0">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="leading-snug">
                            {a.card && (
                              <span className="inline-block mr-1.5 rounded-md bg-primary/15 text-primary px-1.5 py-0.5 text-[11px] font-semibold align-middle">
                                #{a.card}
                              </span>
                            )}
                            {a.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold mb-2">
                    Impedimentos abertos · {r.impediments.length}
                  </p>
                  {r.impediments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum impedimento aberto nesta data.</p>
                  ) : (
                    <div className="space-y-2">
                      {r.impediments.map((i: any) => (
                        <div
                          key={i.id}
                          className="rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-3.5 py-2.5 text-sm flex gap-2.5"
                        >
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                          <div>
                            <p className="leading-snug">{i.description}</p>
                            {i.entry_date && (
                              <p className="text-[11px] text-muted-foreground mt-1">
                                Aberto em {new Date(`${i.entry_date}T12:00:00`).toLocaleDateString("pt-BR")}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {r.impedimentsResolved.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold mb-2">
                      Impedimentos sanados · {r.impedimentsResolved.length}
                    </p>
                    <div className="space-y-2">
                      {r.impedimentsResolved.map((i: any) => (
                        <div
                          key={i.id}
                          className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-3.5 py-2.5 text-sm flex gap-2.5"
                        >
                          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <div>
                            <p className="leading-snug">{i.description}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {i.entry_date && `Aberto em ${new Date(`${i.entry_date}T12:00:00`).toLocaleDateString("pt-BR")}`}
                              {i.resolvedDay && ` · Sanado em ${new Date(`${i.resolvedDay}T12:00:00`).toLocaleDateString("pt-BR")}`}
                            </p>
                            {i.resolution_note && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 italic">{i.resolution_note}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="px-6 md:px-10 py-6 border-t border-border/60 text-[11px] text-muted-foreground">
          E-mail gerado automaticamente pelo Fadami Flow · protótipo de layout.
        </div>
      </div>
    </div>
  );
}
