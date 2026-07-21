import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Award,
  Trophy,
  AlertTriangle,
  CalendarX,
  Clock,
  HelpCircle,
  Repeat,
  AlertOctagon,
  Printer,
  Copy,
  FileText,
} from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useSquads } from "@/hooks/useSquads";
import { useProfiles } from "@/hooks/useProfiles";
import { useDevDailyImpedimentsByEntries, URGENCY_LABELS } from "@/hooks/useDevDailyImpediments";
import { useDailyEntryTagsByEntries } from "@/hooks/useDailyEntryTags";
import { DEV_ABSENCE_LABELS, type DevAbsenceType } from "@/hooks/useDevAbsences";
import {
  isAwaitingTask,
  isRepeatedFromPrev,
  isShortText,
  MANUAL_TAG_OPTIONS,
  type ManualTag,
} from "@/lib/executiveReportRules";

type SectionId =
  | "bom_exemplo"
  | "melhor_squad"
  | "preenchimento_incorreto"
  | "faltas"
  | "sem_pre_daily"
  | "aguardando"
  | "repetidas"
  | "impedimentos";

interface ReportItem {
  id: string;
  text: string;
  meta?: string;
}

interface ReportSection {
  id: SectionId;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  origin: string;
  items: ReportItem[];
}

interface ItemState {
  included: boolean;
  text: string;
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function prevBusinessDay(iso: string) {
  const d = parseISO(iso);
  d.setDate(d.getDate() - 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function RelatorioExecutivoPage() {
  const [date, setDate] = useState<string>(todayISO());
  const prevDate = useMemo(() => prevBusinessDay(date), [date]);
  const sevenDaysAgo = useMemo(() => {
    const d = subDays(parseISO(date), 6);
    return format(d, "yyyy-MM-dd");
  }, [date]);

  const { data: squads = [] } = useSquads();
  const { data: profiles = [] } = useProfiles();

  const squadById = useMemo(() => {
    const m = new Map<string, any>();
    (squads as any[]).forEach((s) => m.set(s.id, s));
    return m;
  }, [squads]);

  const nameByUser = useMemo(() => {
    const m = new Map<string, string>();
    (profiles as any[]).forEach((p) => {
      const nm = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email || p.user_id;
      m.set(p.user_id, nm);
    });
    return m;
  }, [profiles]);

  // Todas as entries do dia (todas as squads).
  const { data: todayEntries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["exec-report", "entries", date],
    queryFn: async () => {
      const { data, error } = await (supabase.from("dev_daily_entries") as any)
        .select("id,user_id,squad_id,entry_date,did_yesterday,will_do_today,impediments,general_notes,fill_completed_at,created_at")
        .eq("entry_date", date);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Entries do dia anterior (por user) — usado para repetição.
  const { data: prevEntries = [] } = useQuery({
    queryKey: ["exec-report", "prev-entries", prevDate],
    queryFn: async () => {
      const { data, error } = await (supabase.from("dev_daily_entries") as any)
        .select("id,user_id,squad_id,entry_date,will_do_today")
        .eq("entry_date", prevDate);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Reuniões do dia (para "sem pré-daily no prazo").
  const { data: meetings = [] } = useQuery({
    queryKey: ["exec-report", "meetings", date],
    queryFn: async () => {
      const { data, error } = await (supabase.from("daily_meetings") as any)
        .select("id,squad_id,started_at,finished_at,created_at")
        .eq("meeting_date", date);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Ausências ativas cobrindo os últimos 7 dias.
  const { data: absences = [] } = useQuery({
    queryKey: ["exec-report", "absences", date, sevenDaysAgo],
    queryFn: async () => {
      const { data, error } = await (supabase.from("dev_absences") as any)
        .select("*")
        .eq("active", true)
        .lte("start_date", date)
        .gte("end_date", sevenDaysAgo);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Membros de todas as squads (para "sem pré-daily no prazo").
  const { data: squadMembers = [] } = useQuery({
    queryKey: ["exec-report", "squad-members-all"],
    queryFn: async () => {
      const { data: sm } = await (supabase.from("squad_members") as any)
        .select("squad_id,team_member_id");
      const tmIds = Array.from(new Set((sm ?? []).map((r: any) => r.team_member_id)));
      if (tmIds.length === 0) return [] as any[];
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
      const tmMap = new Map<string, { user_id: string | null; name: string }>();
      (tms ?? []).forEach((t: any) => {
        const em = String(t.email ?? "").trim().toLowerCase();
        const nm = String(t.name ?? "").trim().toLowerCase();
        const p = (em && byEmail.get(em)) || (nm && byName.get(nm)) || null;
        tmMap.set(t.id, { user_id: p?.user_id ?? null, name: t.name ?? "—" });
      });
      return (sm ?? []).map((r: any) => ({
        squad_id: r.squad_id,
        user_id: tmMap.get(r.team_member_id)?.user_id ?? null,
        name: tmMap.get(r.team_member_id)?.name ?? "—",
      }));
    },
  });

  const entryIds = useMemo(() => todayEntries.map((e: any) => e.id), [todayEntries]);
  const { data: impediments = [] } = useDevDailyImpedimentsByEntries(entryIds);
  const { data: manualTags = [] } = useDailyEntryTagsByEntries(entryIds);

  const tagsByEntry = useMemo(() => {
    const m = new Map<string, ManualTag[]>();
    manualTags.forEach((t) => m.set(t.entry_id, t.tags as ManualTag[]));
    return m;
  }, [manualTags]);

  const entryLabel = (e: any) => {
    const dev = nameByUser.get(e.user_id) ?? "Dev";
    const sq = e.squad_id ? squadById.get(e.squad_id)?.name ?? "Squad" : "Sem squad";
    return `${dev} · ${sq}`;
  };

  // ============ Construção das seções ============
  const sections: ReportSection[] = useMemo(() => {
    const bomExemplo: ReportItem[] = [];
    const melhorSquad: ReportItem[] = [];
    const preenchIncorreto: ReportItem[] = [];
    const aguardando: ReportItem[] = [];
    const repetidas: ReportItem[] = [];

    const prevByUser = new Map<string, any>();
    (prevEntries as any[]).forEach((p) => prevByUser.set(p.user_id, p));

    const squadMelhorTagged = new Set<string>();

    (todayEntries as any[]).forEach((e) => {
      const tags = tagsByEntry.get(e.id) ?? [];
      const label = entryLabel(e);
      if (tags.includes("bom_exemplo")) {
        bomExemplo.push({ id: `manual-${e.id}`, text: `${label} — bom exemplo de preenchimento.` });
      }
      if (tags.includes("melhor_squad") && e.squad_id) {
        squadMelhorTagged.add(e.squad_id);
      }
      const shortReasons: string[] = [];
      if (isShortText(e.did_yesterday)) shortReasons.push('campo "Ontem" curto');
      if (isShortText(e.will_do_today)) shortReasons.push('campo "Hoje" curto');
      const isManualIncorrect = tags.includes("preenchimento_incorreto");
      if (shortReasons.length > 0 || isManualIncorrect) {
        const parts: string[] = [];
        if (shortReasons.length > 0) parts.push(shortReasons.join(" e "));
        if (isManualIncorrect) parts.push("marcado pelo Admin");
        preenchIncorreto.push({
          id: `pi-${e.id}`,
          text: `${label} — ${parts.join("; ")}.`,
        });
      }
      const isAwaiting = isAwaitingTask(e.will_do_today);
      const isManualAwait = tags.includes("aguardando_tarefa");
      if (isAwaiting || isManualAwait) {
        const trecho = (e.will_do_today ?? "").trim().slice(0, 120);
        aguardando.push({
          id: `aw-${e.id}`,
          text: `${label} — ${isAwaiting ? "texto contém indicação de aguardo" : "marcado pelo Admin"}${trecho ? ` (\"${trecho}${trecho.length >= 120 ? "…" : ""}\")` : ""}.`,
        });
      }
      const prev = prevByUser.get(e.user_id);
      if (prev?.will_do_today && e.will_do_today && isRepeatedFromPrev(e.will_do_today, prev.will_do_today)) {
        repetidas.push({
          id: `rp-${e.id}`,
          text: `${label} — repetiu ou manteve a tarefa do dia anterior (${format(parseISO(prev.entry_date), "dd/MM", { locale: ptBR })}).`,
        });
      }
    });

    squadMelhorTagged.forEach((sid) => {
      const sq = squadById.get(sid);
      melhorSquad.push({
        id: `ms-${sid}`,
        text: `${sq?.name ?? "Squad"} — destaque como melhor squad do dia.`,
      });
    });

    // Faltas (últimos 7 dias)
    const faltasItems: ReportItem[] = (absences as any[]).map((a) => {
      const nm = nameByUser.get(a.user_id) ?? "Dev";
      const tipo = DEV_ABSENCE_LABELS[a.absence_type as DevAbsenceType] ?? a.absence_type;
      const periodo =
        a.start_date === a.end_date
          ? format(parseISO(a.start_date), "dd/MM", { locale: ptBR })
          : `${format(parseISO(a.start_date), "dd/MM", { locale: ptBR })} a ${format(parseISO(a.end_date), "dd/MM", { locale: ptBR })}`;
      const motivo = a.notes ? ` — motivo: ${a.notes}` : "";
      return {
        id: `ab-${a.id}`,
        text: `${nm} — ${tipo} (${periodo})${motivo}.`,
      };
    });

    // Sem pré-daily no prazo
    const meetingBySquad = new Map<string, any>();
    (meetings as any[]).forEach((m) => meetingBySquad.set(m.squad_id, m));
    const entryByUserSquad = new Map<string, any>();
    (todayEntries as any[]).forEach((e) => {
      entryByUserSquad.set(`${e.user_id}|${e.squad_id ?? "null"}`, e);
    });
    const seenLate = new Set<string>();
    const semPreDaily: ReportItem[] = [];
    (squadMembers as any[]).forEach((m) => {
      if (!m.user_id) return;
      const key = `${m.user_id}|${m.squad_id}`;
      if (seenLate.has(key)) return;
      seenLate.add(key);
      const meeting = meetingBySquad.get(m.squad_id);
      if (!meeting) return; // sem daily iniciada, pula
      const entry = entryByUserSquad.get(key);
      const startedAt = meeting.started_at ?? meeting.created_at;
      const finishedAt = meeting.finished_at ?? null;
      const sqName = squadById.get(m.squad_id)?.name ?? "Squad";
      if (!entry) {
        semPreDaily.push({
          id: `sp-${key}`,
          text: `${m.name} · ${sqName} — não enviou o registro até o encerramento da daily.`,
        });
        return;
      }
      const fill = entry.fill_completed_at ?? entry.created_at;
      if (fill && startedAt && new Date(fill) > new Date(startedAt)) {
        const atrasoMin = Math.round((new Date(fill).getTime() - new Date(startedAt).getTime()) / 60000);
        semPreDaily.push({
          id: `sp-${key}`,
          text: `${m.name} · ${sqName} — enviou ${atrasoMin} min após o início da daily.`,
        });
      } else if (!fill && finishedAt) {
        semPreDaily.push({
          id: `sp-${key}`,
          text: `${m.name} · ${sqName} — não enviou até o encerramento da daily.`,
        });
      }
    });

    // Impedimentos abertos/fechados no dia
    const entryById = new Map<string, any>();
    (todayEntries as any[]).forEach((e) => entryById.set(e.id, e));
    const impItems: ReportItem[] = impediments.map((imp) => {
      const e = entryById.get(imp.entry_id);
      const label = e ? entryLabel(e) : "—";
      const status = imp.resolved
        ? `sanado${imp.resolved_at ? ` em ${format(parseISO(imp.resolved_at), "dd/MM HH:mm", { locale: ptBR })}` : ""}`
        : "em aberto";
      return {
        id: `imp-${imp.id}`,
        text: `${label} — [${URGENCY_LABELS[imp.urgency]}] ${imp.description} (${status}).`,
      };
    });

    return [
      { id: "bom_exemplo", title: "Bom exemplo por squad", icon: Award, origin: "Marcações manuais", items: bomExemplo },
      { id: "melhor_squad", title: "Melhor squad", icon: Trophy, origin: "Marcações manuais", items: melhorSquad },
      { id: "preenchimento_incorreto", title: "Preenchimentos incorretos ou vagos", icon: AlertTriangle, origin: "Regra automática + marcações manuais", items: preenchIncorreto },
      { id: "faltas", title: "Faltas recentes (últimos 7 dias)", icon: CalendarX, origin: "Dados automáticos", items: faltasItems },
      { id: "sem_pre_daily", title: "Sem pré-daily no prazo", icon: Clock, origin: "Dados automáticos", items: semPreDaily },
      { id: "aguardando", title: "Aguardando tarefas", icon: HelpCircle, origin: "Palavras-chave + marcações manuais", items: aguardando },
      { id: "repetidas", title: "Tarefas repetidas ou estagnadas", icon: Repeat, origin: "Regra automática", items: repetidas },
      { id: "impedimentos", title: "Impedimentos e bloqueios", icon: AlertOctagon, origin: "Dados automáticos", items: impItems },
    ];
  }, [todayEntries, prevEntries, tagsByEntry, absences, meetings, squadMembers, impediments, squadById, nameByUser]);

  // Estado editável por item
  const [state, setState] = useState<Record<string, ItemState>>({});

  useEffect(() => {
    setState((prev) => {
      const next: Record<string, ItemState> = {};
      sections.forEach((s) => {
        s.items.forEach((it) => {
          next[it.id] = prev[it.id] ?? { included: true, text: it.text };
        });
      });
      return next;
    });
  }, [sections]);

  const buildText = () => {
    const lines: string[] = [];
    lines.push(`Relatório Executivo da Daily — ${format(parseISO(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`);
    lines.push("");
    sections.forEach((s) => {
      const items = s.items.filter((it) => state[it.id]?.included);
      if (items.length === 0) return;
      lines.push(`${s.title.toUpperCase()}`);
      items.forEach((it) => {
        lines.push(`  • ${state[it.id]?.text ?? it.text}`);
      });
      lines.push("");
    });
    return lines.join("\n").trim();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildText());
      toast.success("Relatório copiado para a área de transferência");
    } catch {
      toast.error("Não foi possível copiar o texto");
    }
  };

  const handlePrint = () => {
    // Constrói HTML de impressão em nova janela para não interferir no app.
    const win = window.open("", "_blank", "width=900,height=1200");
    if (!win) {
      toast.error("Bloqueio de pop-up impediu a impressão");
      return;
    }
    const dateLabel = format(parseISO(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const sectionsHtml = sections
      .map((s) => {
        const items = s.items.filter((it) => state[it.id]?.included);
        if (items.length === 0) return "";
        return `
          <section>
            <h2>${s.title}</h2>
            <ul>
              ${items.map((it) => `<li>${escapeHtml(state[it.id]?.text ?? it.text)}</li>`).join("")}
            </ul>
          </section>
        `;
      })
      .join("");
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Relatório Executivo — ${dateLabel}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #0f172a; margin: 32px; }
        header { border-bottom: 2px solid #F97316; padding-bottom: 12px; margin-bottom: 24px; }
        h1 { margin: 0; font-size: 22px; color: #0f172a; }
        header p { margin: 4px 0 0; color: #475569; font-size: 13px; }
        section { break-inside: avoid; margin-bottom: 18px; }
        h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em; color: #F97316; border-left: 3px solid #F97316; padding-left: 8px; margin: 0 0 8px; }
        ul { margin: 0; padding-left: 20px; }
        li { font-size: 13px; line-height: 1.5; margin-bottom: 4px; color: #1e293b; }
        footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; }
        @media print { body { margin: 12mm; } }
      </style></head><body>
      <header>
        <h1>Relatório Executivo da Daily</h1>
        <p>${dateLabel} · Fadami Flow</p>
      </header>
      ${sectionsHtml || '<p style="color:#64748b">Nenhum item selecionado.</p>'}
      <footer>Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</footer>
      </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 250);
  };

  return (
    <div className="p-4 md:p-6 w-full max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> Relatório Executivo
          </h1>
          <p className="text-sm text-muted-foreground">
            Consolidação diária das dailys com regras automáticas e marcações manuais.
          </p>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <Label className="mb-1.5 block text-xs">Data do relatório</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl w-[180px]"
            />
          </div>
          <Button variant="outline" className="rounded-xl gap-2" onClick={handleCopy}>
            <Copy className="w-4 h-4" /> Copiar Texto Formatado
          </Button>
          <Button className="rounded-xl gap-2" onClick={handlePrint}>
            <Printer className="w-4 h-4" /> Gerar PDF
          </Button>
        </div>
      </div>

      {loadingEntries && (
        <p className="text-sm text-muted-foreground">Carregando dados…</p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.id} className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" />
                  {s.title}
                </CardTitle>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className="text-[10px] bg-muted/40">
                    {s.origin}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {s.items.length} {s.items.length === 1 ? "item" : "itens"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {s.items.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">Nenhum registro para este tópico.</p>
                )}
                {s.items.map((it) => {
                  const st = state[it.id] ?? { included: true, text: it.text };
                  return (
                    <div
                      key={it.id}
                      className={`rounded-xl border p-3 space-y-2 transition-colors ${
                        st.included ? "bg-background" : "bg-muted/30 opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
                          Incluir no relatório final
                        </span>
                        <Switch
                          checked={st.included}
                          onCheckedChange={(v) =>
                            setState((p) => ({ ...p, [it.id]: { ...st, included: v } }))
                          }
                        />
                      </div>
                      <Textarea
                        value={st.text}
                        onChange={(e) =>
                          setState((p) => ({ ...p, [it.id]: { ...st, text: e.target.value } }))
                        }
                        className="rounded-lg text-sm min-h-[64px]"
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border bg-muted/20 p-4">
        <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2">
          Legenda das marcações manuais
        </p>
        <div className="flex flex-wrap gap-2">
          {MANUAL_TAG_OPTIONS.map((o) => (
            <Badge key={o.value} variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
              {o.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}