import { useMemo, useState } from "react";
import {
  Users, Target, Zap, XCircle, AlertTriangle, ArrowRight, ArrowLeft, ChevronDown,
  CalendarDays, Info, MessageSquare, RefreshCcw, Hourglass, Compass, Bell, Moon,
} from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  activeIssuesCard, clientDistribution, collaborators, days, effortLegend,
  recurrentCard, reworkCard, sprintEffort, sprints, squads, strategicEvolution,
  teamKpis, type EffortSlice, type Task, type TaskStatus,
} from "@/data/dailyflowMock";

/* ------------------------------------------------------------------ tokens */
const C = {
  bg: "#07111D",
  bg2: "#091624",
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
  gray: "#94A3B8",
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  executado: C.green,
  nao_planejado: C.yellow,
  nao_executado: C.red,
};

const KPI_ICONS = { users: Users, target: Target, zap: Zap, x: XCircle, alert: AlertTriangle } as const;

/* --------------------------------------------------------------- primitives */
function Dot({ color, size = 6 }: { color: string; size?: number }) {
  return <span className="inline-block rounded-full shrink-0" style={{ background: color, width: size, height: size }} />;
}

function CountTrio({ counts, size = 6, className = "" }: { counts: { green: number; yellow: number; red: number }; size?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`} style={{ color: C.sub, fontSize: 11 }}>
      <span className="flex items-center gap-1"><Dot color={C.green} size={size} />{counts.green}</span>
      <span className="flex items-center gap-1"><Dot color={C.yellow} size={size} />{counts.yellow}</span>
      <span className="flex items-center gap-1"><Dot color={C.red} size={size} />{counts.red}</span>
    </div>
  );
}

function EffortBar({ slices, height = 4, showLabels = false }: { slices: EffortSlice[]; height?: number; showLabels?: boolean }) {
  return (
    <div className="flex w-full overflow-hidden rounded-full" style={{ height }}>
      {slices.map((s) => (
        <div
          key={s.key}
          className="flex items-center justify-center"
          style={{ width: `${s.value}%`, background: effortLegend[s.key].color, height: "100%" }}
        >
          {showLabels && s.value >= 5 && (
            <span className="text-[11px] font-semibold" style={{ color: "#0B1826" }}>{s.value}%</span>
          )}
        </div>
      ))}
    </div>
  );
}

function MiniMetric({ icon: Icon, value, color }: { icon: typeof Users; value: string | number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="flex h-[18px] w-[18px] items-center justify-center rounded-full"
        style={{ border: `1px solid ${color}55`, background: `${color}14` }}
      >
        <Icon size={10} style={{ color }} strokeWidth={1.7} />
      </span>
      <span className="text-[10px] leading-none font-medium" style={{ color }}>{value}</span>
    </div>
  );
}

/* --------------------------------------------------------------- task row */
function TaskRow({ task }: { task: Task }) {
  return (
    <div className="group flex items-start gap-1.5 leading-[14px]" title={task.title}>
      <span className="mt-[5px]"><Dot color={STATUS_COLOR[task.status]} size={5} /></span>
      <span className="truncate text-[11.5px]" style={{ color: C.text }}>{task.title}</span>
      <span className="ml-auto flex shrink-0 items-center gap-1 pt-[1px]">
        {task.isRecurrent && <Hourglass size={11} style={{ color: C.blue }} strokeWidth={1.6} />}
        {task.isRework && <RefreshCcw size={11} style={{ color: C.purple }} strokeWidth={1.6} />}
        {task.hasImpediment && <AlertTriangle size={11} style={{ color: C.orange }} strokeWidth={1.6} />}
      </span>
    </div>
  );
}

function DayCellView({ tasks }: { tasks: Task[] }) {
  const visible = tasks.slice(0, 4);
  const rest = tasks.length - visible.length;
  const notes = tasks.filter((t) => t.hasNote).length;
  const impediments = tasks.filter((t) => t.hasImpediment).length;

  return (
    <div className="flex h-full flex-col gap-[2px] px-3 py-2">
      {visible.map((t) => <TaskRow key={t.id} task={t} />)}
      <div className="mt-auto flex items-center gap-2 pt-1">
        {rest > 0 && <span className="text-[10.5px]" style={{ color: C.dim }}>+{rest} mais</span>}
        <span className="ml-auto flex items-center gap-2">
          {impediments > 0 && (
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: C.orange }}>
              <AlertTriangle size={10} strokeWidth={1.6} />{impediments}
            </span>
          )}
          {notes > 0 && (
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: C.dim }}>
              <MessageSquare size={10} strokeWidth={1.6} />{notes}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- donut */
function Donut({ data }: { data: typeof clientDistribution }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  let acc = 0;
  const r = 32, cx = 40, cy = 40, stroke = 15;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={80} height={80} viewBox="0 0 80 80" className="shrink-0">
      {data.map((d) => {
        const len = (d.value / total) * circ;
        const el = (
          <circle
            key={d.name}
            cx={cx} cy={cy} r={r} fill="none"
            stroke={d.color} strokeWidth={stroke}
            strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={-acc}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        acc += len;
        return el;
      })}
      <circle cx={cx} cy={cy} r={r - stroke / 2 - 1} fill={C.card} />
    </svg>
  );
}

/* ------------------------------------------------------------------- page */
export default function VisaoDiariaPage() {
  const [squadId, setSquadId] = useState(squads[0].id);
  const [sprintId, setSprintId] = useState(sprints[sprints.length - 1].id);

  const squad = squads.find((s) => s.id === squadId)!;
  const sprint = sprints.find((s) => s.id === sprintId)!;
  const gridCols = useMemo(() => `260px repeat(${days.length}, minmax(0,1fr))`, []);

  return (
    <div className="w-full" style={{ background: C.bg, color: C.text, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="flex flex-col gap-2 p-3 pb-4">
        {/* HEADER */}
        <div className="flex items-center gap-4 px-1 py-1">
          <div className="flex items-baseline gap-1 text-[19px] font-semibold tracking-tight">
            <span style={{ color: C.text }}>Fadami</span><span style={{ color: C.orange }}>Flow</span>
          </div>
          <span className="text-[13px] font-medium" style={{ color: C.text }}>DailyFlow</span>
          <span className="text-[12.5px]" style={{ color: C.sub }}>Visão diária de atividades por colaborador</span>
          <div className="ml-auto flex items-center gap-4">
            <Bell size={16} style={{ color: C.sub }} strokeWidth={1.6} />
            <Moon size={16} style={{ color: C.sub }} strokeWidth={1.6} />
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold"
              style={{ background: C.purple, color: "#fff" }}
            >FM</span>
          </div>
        </div>

        {/* FILTROS */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-[46px] w-[280px] items-center justify-between rounded-lg px-3 text-left"
                style={{ background: C.card, border: `1px solid ${C.border}` }}
              >
                <span className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wide" style={{ color: C.dim }}>Squad</span>
                  <span className="text-[15px] font-medium" style={{ color: C.text }}>{squad.name}</span>
                </span>
                <ChevronDown size={16} style={{ color: C.sub }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {squads.map((s) => (
                <DropdownMenuItem key={s.id} onSelect={() => setSquadId(s.id)}>{s.name}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            className="flex h-[46px] w-[46px] items-center justify-center rounded-lg"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            <ArrowLeft size={16} style={{ color: C.sub }} />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-[46px] items-center gap-3 rounded-lg px-4"
                style={{ background: C.card, border: `1px solid ${C.border}` }}
              >
                <span className="text-[13px]" style={{ color: C.sub }}>Sprint</span>
                <span className="text-[15px] font-medium" style={{ color: C.text }}>{sprint.name.replace("Sprint ", "Sprint ")}</span>
                <ChevronDown size={16} style={{ color: C.sub }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {sprints.map((s) => (
                <DropdownMenuItem key={s.id} onSelect={() => setSprintId(s.id)}>{s.name}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div
            className="flex h-[46px] items-center gap-3 rounded-lg px-4"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            <CalendarDays size={15} style={{ color: C.sub }} strokeWidth={1.6} />
            <span className="text-[14px]" style={{ color: C.text }}>{sprint.start} - {sprint.end}</span>
            <CalendarDays size={15} style={{ color: C.sub }} strokeWidth={1.6} />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <button
                className="ml-auto flex h-[46px] items-center gap-2 rounded-lg px-4 text-[13.5px]"
                style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }}
              >
                Legenda <Info size={15} style={{ color: C.sub }} strokeWidth={1.6} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-2 border-[#183047] bg-[#0B1826] text-[12px] text-[#E8F0F7]">
              <div className="flex items-center gap-2"><Dot color={C.green} /> Planejado e executado</div>
              <div className="flex items-center gap-2"><Dot color={C.yellow} /> Executado, mas não planejado</div>
              <div className="flex items-center gap-2"><Dot color={C.red} /> Planejado, mas não executado</div>
              <div className="flex items-center gap-2"><AlertTriangle size={12} style={{ color: C.orange }} /> Impedimento</div>
              <div className="flex items-center gap-2"><RefreshCcw size={12} style={{ color: C.purple }} /> Retrabalho</div>
              <div className="flex items-center gap-2"><Hourglass size={12} style={{ color: C.blue }} /> Tarefa recorrente ({">"} 1 dia)</div>
              <div className="flex items-center gap-2"><MessageSquare size={12} style={{ color: C.dim }} /> Observação</div>
            </PopoverContent>
          </Popover>
        </div>

        {/* KPIs */}
        <div
          className="grid rounded-xl"
          style={{ gridTemplateColumns: "repeat(5, minmax(0,1fr))", background: C.card, border: `1px solid ${C.border}` }}
        >
          {teamKpis.map((k, i) => {
            const Icon = KPI_ICONS[k.icon];
            return (
              <div
                key={k.id}
                className="flex items-center gap-3 px-5 py-3"
                style={{ borderLeft: i === 0 ? "none" : `1px solid ${C.border2}` }}
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                  style={{ border: `1.5px solid ${k.color}55`, background: `${k.color}12` }}
                >
                  <Icon size={22} style={{ color: k.color }} strokeWidth={1.5} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] uppercase tracking-wide" style={{ color: C.sub }}>{k.label}</div>
                  <div className="text-[26px] font-semibold leading-tight" style={{ color: k.color }}>{k.value}</div>
                  <div className="truncate text-[11px]" style={{ color: C.dim }}>{k.caption}</div>
                  {typeof k.progress === "number" && (
                    <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full" style={{ background: `${C.border2}` }}>
                      <div className="h-full rounded-full" style={{ width: `${k.progress}%`, background: k.color }} />
                    </div>
                  )}
                </div>
                {k.action && <ArrowRight size={18} style={{ color: C.sub }} strokeWidth={1.5} />}
              </div>
            );
          })}
        </div>

        {/* MATRIZ */}
        <div className="overflow-hidden rounded-xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          {/* cabeçalho */}
          <div className="grid" style={{ gridTemplateColumns: gridCols, background: C.card2 }}>
            <div className="px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide" style={{ color: C.sub }}>
              Colaboradores
            </div>
            {days.map((d) => (
              <div
                key={d.id}
                className="flex flex-col items-center justify-center gap-0.5 py-2"
                style={{ borderLeft: `1px solid ${C.border2}` }}
              >
                <span className="text-[12.5px] font-medium" style={{ color: C.text }}>{d.weekday} {d.label}</span>
                <CountTrio counts={d.counts} size={5} />
              </div>
            ))}
          </div>

          {/* linhas */}
          {collaborators.map((c, idx) => (
            <div
              key={c.id}
              className="grid"
              style={{ gridTemplateColumns: gridCols, borderTop: idx === 0 ? `1px solid ${C.border2}` : `1px solid ${C.border2}` }}
            >
              {/* coluna colaborador */}
              <div className="flex flex-col gap-1.5 px-3 py-2" style={{ background: C.card2 }}>
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold"
                    style={{ background: `${C.purple}22`, border: `1px solid ${C.purple}55`, color: C.text }}
                  >{c.avatar}</span>
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] font-semibold leading-tight" style={{ color: C.text }}>{c.name}</div>
                    <div className="truncate text-[10.5px]" style={{ color: C.dim }}>{c.role}</div>
                  </div>
                  <CountTrio counts={c.counts} size={5} className="ml-auto" />
                </div>

                <div className="flex items-center justify-between px-1">
                  <MiniMetric icon={Users} value={`${c.metrics.capacity}%`} color={C.green} />
                  <MiniMetric icon={Target} value={`${c.metrics.adherence}%`} color={C.purple} />
                  <MiniMetric icon={Zap} value={`${c.metrics.unplanned}%`} color={C.yellow} />
                  <MiniMetric icon={XCircle} value={`${c.metrics.notExecuted}%`} color={C.red} />
                  <MiniMetric icon={AlertTriangle} value={c.metrics.attention} color={C.orange} />
                </div>

                <div className="mt-auto">
                  <div className="mb-1 text-[8.5px] uppercase tracking-[0.08em]" style={{ color: C.dim }}>
                    Composição do esforço
                  </div>
                  <EffortBar slices={c.effort} height={3} />
                </div>
              </div>

              {/* células por dia */}
              {days.map((d) => {
                const cell = c.days.find((x) => x.dayId === d.id);
                return (
                  <div key={d.id} style={{ borderLeft: `1px solid ${C.border2}` }}>
                    <DayCellView tasks={cell?.tasks ?? []} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* RODAPÉ */}
        <div className="grid gap-2" style={{ gridTemplateColumns: "260px 1.15fr 1.5fr 0.85fr 0.85fr 1fr" }}>
          {/* evolução estratégica */}
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              style={{ border: `1.5px solid ${C.blue}55`, background: `${C.blue}12` }}
            >
              <Compass size={22} style={{ color: C.blue }} strokeWidth={1.5} />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide" style={{ color: C.sub }}>Evolução estratégica</div>
              <div className="text-[26px] font-semibold leading-tight" style={{ color: C.blue }}>{strategicEvolution.value}</div>
              <div className="truncate text-[11px]" style={{ color: C.dim }}>{strategicEvolution.caption}</div>
            </div>
          </div>

          {/* composição do esforço */}
          <div className="rounded-xl px-4 py-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="mb-2 flex items-center gap-1.5 text-[10.5px] uppercase tracking-wide" style={{ color: C.sub }}>
              Composição do esforço <Info size={11} style={{ color: C.dim }} />
            </div>
            <EffortBar slices={sprintEffort} height={22} showLabels />
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              {sprintEffort.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5 text-[11px]" style={{ color: C.sub }}>
                  <Dot color={effortLegend[s.key].color} />{effortLegend[s.key].label}
                </span>
              ))}
            </div>
          </div>

          {/* distribuição por cliente */}
          <div className="rounded-xl px-4 py-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="mb-2 text-[10.5px] uppercase tracking-wide" style={{ color: C.sub }}>Distribuição por cliente</div>
            <div className="flex items-center gap-4">
              <Donut data={clientDistribution} />
              <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1">
                {clientDistribution.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-[10.5px]">
                    <Dot color={d.color} size={5} />
                    <span className="truncate" style={{ color: C.sub }}>{d.name}</span>
                    <span className="ml-auto" style={{ color: C.text }}>{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* retrabalhos */}
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              style={{ border: `1.5px solid ${C.red}55`, background: `${C.red}12` }}
            >
              <RefreshCcw size={20} style={{ color: C.red }} strokeWidth={1.5} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide" style={{ color: C.sub }}>
                Retrabalhos <Info size={10} style={{ color: C.dim }} />
              </div>
              <div className="text-[26px] font-semibold leading-tight" style={{ color: C.text }}>{reworkCard.value}</div>
              <div className="truncate text-[11px]" style={{ color: C.dim }}>{reworkCard.caption}</div>
            </div>
          </div>

          {/* recorrentes */}
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <Hourglass size={26} style={{ color: C.yellow }} strokeWidth={1.4} />
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide" style={{ color: C.sub }}>
                Recorrentes <Info size={10} style={{ color: C.dim }} />
              </div>
              <div className="text-[26px] font-semibold leading-tight" style={{ color: C.text }}>{recurrentCard.value}</div>
              <div className="text-[10.5px] leading-tight" style={{ color: C.dim }}>{recurrentCard.caption}</div>
            </div>
          </div>

          {/* problemas ativos */}
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <AlertTriangle size={26} style={{ color: C.orange }} strokeWidth={1.4} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide" style={{ color: C.sub }}>
                Problemas ativos <Info size={10} style={{ color: C.dim }} />
              </div>
              <div className="text-[26px] font-semibold leading-tight" style={{ color: C.orange }}>{activeIssuesCard.value}</div>
              <div className="text-[10.5px] leading-tight" style={{ color: C.dim }}>{activeIssuesCard.caption}</div>
            </div>
            <ArrowRight size={18} style={{ color: C.sub }} strokeWidth={1.5} />
          </div>
        </div>
      </div>
    </div>
  );
}
