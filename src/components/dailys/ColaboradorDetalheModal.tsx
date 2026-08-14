import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  CheckCircle2, Clock, XCircle, Target, Timer, Zap, AlertTriangle, CalendarCheck,
  ClipboardList, TrendingUp, Wallet, ExternalLink, Circle,
} from "lucide-react";
import {
  days, effortLegend, detailQuality, detailHours, detailEffort, detailAtuacao,
  detailNotes, detailImpediments, type Collaborator, type Task, type TaskStatus,
} from "@/data/dailyflowMock";

const C = {
  bg: "#0A1522",
  card: "#0B1826",
  card2: "#0E1B2A",
  border: "#183047",
  border2: "#1C3147",
  text: "#E8F0F7",
  sub: "#9FB1C5",
  dim: "#70839A",
  green: "#22C55E",
  purple: "#8B5CF6",
  blue: "#3B82F6",
  yellow: "#FBBF24",
  orange: "#F59E0B",
  red: "#EF4444",
};

const STATUS_ICON: Record<TaskStatus, { icon: typeof CheckCircle2; color: string }> = {
  executado: { icon: CheckCircle2, color: C.green },
  nao_planejado: { icon: Clock, color: C.yellow },
  nao_executado: { icon: XCircle, color: C.red },
};

function Pill({ icon: Icon, color, value, label }: { icon: typeof Target; color: string; value: string; label: string }) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
      style={{ background: C.card2, border: `1px solid ${C.border2}` }}
    >
      <Icon size={13} style={{ color }} strokeWidth={1.8} />
      <span className="text-[13px] font-semibold" style={{ color }}>{value}</span>
      <span className="text-[11.5px]" style={{ color: C.sub }}>{label}</span>
    </div>
  );
}

function QualityCard({
  icon: Icon, color, label, caption, dots,
}: { icon: typeof CalendarCheck; color: string; label: string; caption: string; dots: string[] }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: C.card2, border: `1px solid ${C.border2}` }}>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ border: `1px solid ${color}44`, background: `${color}14` }}
      >
        <Icon size={17} style={{ color }} strokeWidth={1.6} />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-medium" style={{ color: C.text }}>{label}</span>
          <span className="flex items-center gap-1">
            {dots.map((d, i) => (
              <span key={i} className="h-2 w-2 rounded-full" style={{ background: d }} />
            ))}
          </span>
        </div>
        <div className="truncate text-[11px]" style={{ color: C.dim }}>{caption}</div>
      </div>
    </div>
  );
}

function DayColumn({ title, dotColor, tasks }: { title: string; dotColor: string; tasks: Task[] }) {
  const done = tasks.filter((t) => t.status === "executado").length;
  const doing = tasks.filter((t) => t.status === "nao_planejado").length;
  const notDone = tasks.filter((t) => t.status === "nao_executado").length;
  return (
    <div className="rounded-xl px-3.5 py-3" style={{ background: C.card2, border: `1px solid ${C.border2}` }}>
      <div className="mb-2 flex items-center gap-2">
        <Circle size={13} style={{ color: dotColor }} strokeWidth={2} />
        <span className="text-[12.5px] font-semibold uppercase tracking-wide" style={{ color: C.text }}>{title}</span>
      </div>
      <div className="space-y-1.5">
        {tasks.map((t) => {
          const S = STATUS_ICON[t.status];
          return (
            <div key={t.id} className="flex items-start gap-2">
              <S.icon size={13} className="mt-[2px] shrink-0" style={{ color: S.color }} strokeWidth={1.8} />
              <span className="text-[12px] leading-snug" style={{ color: C.text }}>{t.title}</span>
            </div>
          );
        })}
        {tasks.length === 0 && <span className="text-[12px]" style={{ color: C.dim }}>Sem registros.</span>}
      </div>
      <div
        className="mt-2.5 flex items-center gap-4 border-t pt-2 text-[11.5px]"
        style={{ borderColor: C.border2 }}
      >
        <span style={{ color: C.green }}>Concluídas: {done}</span>
        <span style={{ color: C.yellow }}>Em andamento: {doing}</span>
        <span style={{ color: C.red }}>Não executadas: {notDone}</span>
        <span className="ml-auto" style={{ color: C.sub }}>Total: {tasks.length}</span>
      </div>
    </div>
  );
}

function NoteCard({ note, boxed }: { note: typeof detailNotes[number]; boxed?: boolean }) {
  return (
    <div
      className={boxed ? "rounded-lg px-3 py-2.5" : "px-1 py-1"}
      style={boxed ? { background: `${note.color}0F`, border: `1px solid ${note.color}44` } : undefined}
    >
      <div className="flex items-start gap-2">
        {boxed
          ? <AlertTriangle size={13} className="mt-[2px] shrink-0" style={{ color: note.color }} strokeWidth={1.8} />
          : <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: note.color }} />}
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-medium" style={{ color: C.text }}>{note.title}</div>
          <p className="mt-0.5 text-[11.5px] leading-snug" style={{ color: C.sub }}>{note.description}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[11px]" style={{ color: C.dim }}>
            <span>Responsável: {note.owner}</span>
            {!boxed && <span className="ml-auto">Alerta em: {note.when}</span>}
          </div>
          {note.status && (
            <div className="mt-1.5 flex items-center gap-2 text-[11px]" style={{ color: C.dim }}>
              Status:
              <span
                className="rounded px-1.5 py-0.5 text-[10.5px] font-medium"
                style={{ background: `${C.orange}22`, color: C.orange }}
              >{note.status}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props {
  collaborator: Collaborator | null;
  dayId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ColaboradorDetalheModal({ collaborator, dayId, open, onOpenChange }: Props) {
  if (!collaborator) return null;
  const idx = Math.max(0, days.findIndex((d) => d.id === dayId));
  const day = days[idx];
  const prev = days[idx - 1];
  const tasksFor = (id?: string) => (id ? collaborator.days.find((x) => x.dayId === id)?.tasks ?? [] : []);
  const todayTasks = tasksFor(day?.id);
  const done = todayTasks.filter((t) => t.status === "executado").length;
  const doing = todayTasks.filter((t) => t.status === "nao_planejado").length;
  const notDone = todayTasks.filter((t) => t.status === "nao_executado").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[1080px] w-[calc(100vw-3rem)] max-h-[90vh] overflow-y-auto border p-5"
        style={{ background: C.bg, borderColor: C.border, color: C.text }}
      >
        {/* header */}
        <div className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full text-[13px] font-semibold"
            style={{ background: `${C.purple}22`, border: `1px solid ${C.purple}55`, color: C.text }}
          >{collaborator.avatar}</span>
          <div>
            <div className="text-[19px] font-semibold leading-tight">
              {collaborator.name} <span style={{ color: C.sub }}>— {day?.weekday} {day?.label}</span>
            </div>
            <div className="text-[12px]" style={{ color: C.dim }}>{collaborator.role}</div>
          </div>
        </div>

        {/* pills */}
        <div className="flex flex-wrap items-center gap-2">
          <Pill icon={CheckCircle2} color={C.green} value={String(done)} label="concluídas" />
          <Pill icon={Clock} color={C.yellow} value={String(doing)} label="em andamento" />
          <Pill icon={XCircle} color={C.red} value={String(notDone)} label="não executada" />
          <Pill icon={Target} color={C.blue} value={`${collaborator.metrics.capacity}%`} label="conforme" />
          <Pill icon={Timer} color={C.purple} value={`${collaborator.metrics.adherence}%`} label="aderência" />
          <Pill icon={Zap} color={C.red} value={`${collaborator.metrics.unplanned}%`} label="não planejado" />
          <Pill icon={AlertTriangle} color={C.orange} value={String(detailNotes.length + detailImpediments.length)} label="observações" />
        </div>

        {/* qualidade + horas */}
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, 1fr) 0.7fr 0.8fr" }}>
          <QualityCard icon={CalendarCheck} color={C.green} label={detailQuality.assiduidade.label} caption={detailQuality.assiduidade.caption} dots={detailQuality.assiduidade.dots} />
          <QualityCard icon={ClipboardList} color={C.blue} label={detailQuality.organizacao.label} caption={detailQuality.organizacao.caption} dots={detailQuality.organizacao.dots} />
          <QualityCard icon={TrendingUp} color={C.green} label={detailQuality.performance.label} caption={detailQuality.performance.caption} dots={detailQuality.performance.dots} />
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: C.card2, border: `1px solid ${C.border2}` }}>
            <Clock size={15} style={{ color: C.sub }} strokeWidth={1.6} />
            <div>
              <div className="text-[11.5px]" style={{ color: C.sub }}>Horas extra</div>
              <div className="text-[14px] font-semibold" style={{ color: C.text }}>{detailHours.extra}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: C.card2, border: `1px solid ${C.border2}` }}>
            <Wallet size={15} style={{ color: C.sub }} strokeWidth={1.6} />
            <div>
              <div className="text-[11.5px]" style={{ color: C.sub }}>Saldo banco de horas</div>
              <div className="text-[14px] font-semibold" style={{ color: C.green }}>{detailHours.bank}</div>
            </div>
          </div>
        </div>

        {/* composição do esforço */}
        <div>
          <div className="mb-1.5 text-[10.5px] uppercase tracking-wide" style={{ color: C.sub }}>Composição do esforço</div>
          <div className="flex gap-1.5">
            {detailEffort.map((s) => (
              <div
                key={s.key}
                className="flex h-8 items-center justify-center rounded-lg text-[12px] font-medium"
                style={{
                  flex: s.value,
                  background: `${effortLegend[s.key].color}33`,
                  border: `1px solid ${effortLegend[s.key].color}66`,
                  color: C.text,
                }}
              >
                {s.value}% {effortLegend[s.key].label}
              </div>
            ))}
          </div>
        </div>

        {/* distribuição de atuação */}
        <div>
          <div className="mb-1.5 text-[10.5px] uppercase tracking-wide" style={{ color: C.sub }}>Distribuição de atuação</div>
          <div className="grid grid-cols-4 gap-2">
            {detailAtuacao.map((a) => (
              <div
                key={a.label}
                className="flex items-center gap-2 rounded-lg px-3 py-2"
                style={{ background: C.card2, border: `1px solid ${C.border2}` }}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: a.color }} />
                <span className="truncate text-[12px]" style={{ color: C.text }}>{a.label}</span>
                <span className="ml-auto text-[12.5px] font-semibold" style={{ color: C.text }}>{a.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* dias */}
        <div className="grid grid-cols-2 gap-2">
          <DayColumn
            title={prev ? `${prev.weekday} — ${prev.label}` : "Dia anterior"}
            dotColor={C.green}
            tasks={tasksFor(prev?.id)}
          />
          <DayColumn
            title={day ? `${day.weekday} — ${day.label}` : "Hoje"}
            dotColor={C.blue}
            tasks={todayTasks}
          />
        </div>

        {/* observações + impedimentos */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl px-3.5 py-3" style={{ background: C.card2, border: `1px solid ${C.border2}` }}>
            <div className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: C.yellow }}>
              <AlertTriangle size={14} strokeWidth={1.8} /> OBSERVAÇÕES ABERTAS ({detailNotes.length})
            </div>
            <div className="space-y-2">
              {detailNotes.map((n) => <NoteCard key={n.id} note={n} />)}
            </div>
            <button className="mt-2 flex w-full items-center justify-center gap-1.5 text-[11.5px]" style={{ color: C.sub }}>
              Ver todas as observações <ExternalLink size={11} />
            </button>
          </div>

          <div className="rounded-xl px-3.5 py-3" style={{ background: C.card2, border: `1px solid ${C.border2}` }}>
            <div className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: C.red }}>
              <AlertTriangle size={14} strokeWidth={1.8} /> IMPEDIMENTOS ABERTOS ({detailImpediments.length})
            </div>
            <div className="space-y-2">
              {detailImpediments.map((n) => <NoteCard key={n.id} note={n} boxed />)}
            </div>
            <button className="mt-2 flex w-full items-center justify-center gap-1.5 text-[11.5px]" style={{ color: C.sub }}>
              Ver todos os impedimentos <ExternalLink size={11} />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
