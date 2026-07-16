import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, X, Play, AlertTriangle, MessageSquarePlus, UserX, Paperclip, CheckCircle2, Video, VideoOff, Calendar, ChevronDown, ChevronRight, RefreshCcw, UserCheck, CalendarX, UserMinus, ChevronsUpDown, History, Clock, Ban, Stethoscope, Palmtree, Hourglass, Moon, Coffee } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { uploadAttachment } from "@/lib/uploadAttachment";
import { useCreateDailyMeeting } from "@/hooks/useDailyMeetings";
import { useImpedimentMutations, URGENCY_LABELS, URGENCY_STYLES, type DevDailyImpediment } from "@/hooks/useDevDailyImpediments";
import { useDevDailyActivitiesByUsers } from "@/hooks/useDevDailyActivities";
import { useDevDailyEntriesByUsers } from "@/hooks/useDevDailyEntries";
import { useActiveDevAbsences, useCreateDevAbsence, DEV_ABSENCE_LABELS, DEV_ABSENCE_RANGED, type DevAbsenceType, type DevAbsence } from "@/hooks/useDevAbsences";
import { DevHistoryModal } from "@/components/dailys/DevHistoryModal";
import { DevActivityCard } from "@/components/dailys/DevActivityCard";
import { toast } from "sonner";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";

interface MemberRow {
  key: string;
  name: string;
  filled: boolean;
  entry: {
    id: string;
    user_id: string;
    did_yesterday: string | null;
    will_do_today: string | null;
    impediments: string | null;
    general_notes?: string | null;
  } | null;
  imps: DevDailyImpediment[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date: string;
  squadId: string | null;
  members: MemberRow[];
}

type MemberStatus = "present" | "absent_work" | "no_participate";

interface MemberUIState {
  status: MemberStatus;
  camera_on: boolean;
  stayed_silent: boolean;
  notes: string;
  absence_reason: string;
  absence_type: DevAbsenceType | null;
  absence_start: string;
  absence_end: string;
  absence_id: string | null;
}

const defaultState = (filled: boolean): MemberUIState => ({
  status: "present",
  camera_on: filled,
  stayed_silent: false,
  notes: "",
  absence_reason: "",
  absence_type: null,
  absence_start: "",
  absence_end: "",
  absence_id: null,
});

const ABSENCE_ICONS: Record<DevAbsenceType, any> = {
  atestado: Stethoscope,
  ferias: Palmtree,
  banco_horas: Hourglass,
  interjornada: Moon,
  day_off: Coffee,
};

export function IniciarDailyModal({ open, onOpenChange, date, squadId, members }: Props) {
  const create = useCreateDailyMeeting();
  const createAbsence = useCreateDevAbsence();
  const { resolve } = useImpedimentMutations();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [observations, setObservations] = useState("");
  const [transcriptUrl, setTranscriptUrl] = useState<string | null>(null);
  const [transcriptName, setTranscriptName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [memberState, setMemberState] = useState<Record<string, MemberUIState>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [historyFor, setHistoryFor] = useState<{ userId: string | null; name: string } | null>(null);

  const memberUserIds = useMemo(
    () => Array.from(new Set(members.map((m) => m.entry?.user_id).filter((v): v is string => !!v))),
    [members],
  );
  const { data: userActivities = [] } = useDevDailyActivitiesByUsers(open ? memberUserIds : []);
  const { data: userEntriesAll = [] } = useDevDailyEntriesByUsers(open ? memberUserIds : []);
  const { data: activeAbsences = [] } = useActiveDevAbsences(open ? memberUserIds : [], date);

  const absenceByUser = useMemo(() => {
    const map = new Map<string, DevAbsence>();
    activeAbsences.forEach((a) => { if (!map.has(a.user_id)) map.set(a.user_id, a); });
    return map;
  }, [activeAbsences]);

  // Reinicializa somente quando o modal abre
  useEffect(() => {
    if (open) {
      setObservations("");
      setTranscriptUrl(null);
      setTranscriptName(null);
      const init: Record<string, MemberUIState> = {};
      const exp: Record<string, boolean> = {};
      members.forEach((m) => {
        const base = defaultState(m.filled);
        const uid = m.entry?.user_id;
        const abs = uid ? absenceByUser.get(uid) : null;
        init[m.key] = abs
          ? { ...base, status: "absent_work", absence_type: abs.absence_type, absence_start: abs.start_date, absence_end: abs.end_date, absence_id: abs.id, camera_on: false }
          : base;
        // Sempre iniciar retraído — líder expande sob demanda
        exp[m.key] = false;
      });
      setMemberState(init);
      setExpanded(exp);
      setLastRefresh(new Date());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, absenceByUser]);

  // Merge quando a lista de membros muda (por refresh) preservando o já digitado
  useEffect(() => {
    if (!open) return;
    setMemberState((prev) => {
      const next: Record<string, MemberUIState> = {};
      members.forEach((m) => {
        next[m.key] = prev[m.key] ?? defaultState(m.filled);
      });
      return next;
    });
    setExpanded((prev) => {
      const next: Record<string, boolean> = {};
      members.forEach((m) => {
        next[m.key] = prev[m.key] ?? m.imps.some((i) => !i.resolved);
      });
      return next;
    });
  }, [members, open]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dev_daily_entries"] }),
        queryClient.invalidateQueries({ queryKey: ["dev_daily_impediments"] }),
        queryClient.invalidateQueries({ queryKey: ["squad_profiles"] }),
      ]);
      setLastRefresh(new Date());
      toast.success("Daily atualizada");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao atualizar");
    } finally {
      setRefreshing(false);
    }
  };

  const handleFile = async (file: File) => {
    try {
      setUploading(true);
      const url = await uploadAttachment(file, `daily-transcripts/${date}`);
      setTranscriptUrl(url);
      setTranscriptName(file.name);
      toast.success("Transcrição anexada");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  const stats = useMemo(() => {
    const vals = Object.values(memberState);
    return {
      total: vals.length,
      present: vals.filter((v) => v.status === "present").length,
      absent: vals.filter((v) => v.status === "absent_work").length,
      noPart: vals.filter((v) => v.status === "no_participate").length,
      cam: vals.filter((v) => v.status === "present" && v.camera_on).length,
    };
  }, [memberState]);

  const submit = async () => {
    // Valida motivo obrigatório para "não participou"
    const missingReason = members.find((m) => {
      const s = memberState[m.key];
      return s?.status === "no_participate" && !s.absence_reason.trim();
    });
    if (missingReason) {
      toast.error(`Informe o motivo pelo qual ${missingReason.name} não participou da daily.`);
      setExpanded((prev) => ({ ...prev, [missingReason.key]: true }));
      return;
    }

    const missingAbsType = members.find((m) => {
      const s = memberState[m.key];
      return s?.status === "absent_work" && !s.absence_type;
    });
    if (missingAbsType) {
      toast.error(`Selecione o tipo de ausência para ${missingAbsType.name}.`);
      setExpanded((prev) => ({ ...prev, [missingAbsType.key]: true }));
      return;
    }
    const invalidRange = members.find((m) => {
      const s = memberState[m.key];
      if (s?.status !== "absent_work" || !s.absence_type) return false;
      if (!DEV_ABSENCE_RANGED.includes(s.absence_type)) return false;
      if (!s.absence_start || !s.absence_end) return true;
      return s.absence_end < s.absence_start;
    });
    if (invalidRange) {
      toast.error(`Informe o período correto de ausência para ${invalidRange.name}.`);
      setExpanded((prev) => ({ ...prev, [invalidRange.key]: true }));
      return;
    }

    const absenceCreated: Record<string, { id: string; type: DevAbsenceType } | null> = {};
    for (const m of members) {
      const s = memberState[m.key];
      if (s?.status !== "absent_work" || !s.absence_type) continue;
      if (s.absence_id) { absenceCreated[m.key] = { id: s.absence_id, type: s.absence_type }; continue; }
      const uid = m.entry?.user_id;
      if (!uid) { absenceCreated[m.key] = null; continue; }
      const ranged = DEV_ABSENCE_RANGED.includes(s.absence_type);
      const start = ranged ? s.absence_start : date;
      const end = ranged ? s.absence_end : date;
      try {
        const created = await createAbsence.mutateAsync({
          user_id: uid,
          squad_id: squadId,
          absence_type: s.absence_type,
          start_date: start,
          end_date: end,
          notes: s.notes.trim() || null,
        });
        absenceCreated[m.key] = { id: created.id, type: s.absence_type };
      } catch (e) {
        return;
      }
    }

    await create.mutateAsync({
      meeting_date: date,
      squad_id: squadId,
      observations,
      transcript_url: transcriptUrl,
      attendance: members.map((m) => {
        const s = memberState[m.key] ?? defaultState(m.filled);
        const absent = s.status === "absent_work";
        const noPart = s.status === "no_participate";
        const abs = absent ? absenceCreated[m.key] : null;
        return {
          member_name: m.name,
          member_user_id: m.entry?.user_id ?? null,
          // Se ausente/não participou, câmera e "ficou em silêncio" não se aplicam
          camera_on: s.status === "present" ? s.camera_on : false,
          stayed_silent: false,
          dev_entry_id: m.entry?.id ?? null,
          notes: s.notes.trim() || null,
          absent_from_work: absent,
          did_not_participate: noPart,
          non_participation_reason: noPart ? s.absence_reason.trim() : null,
          absence_type: abs?.type ?? null,
          absence_id: abs?.id ?? null,
        } as any;
      }),
    });
    onOpenChange(false);
  };

  const updateMember = (k: string, patch: Partial<MemberUIState>) =>
    setMemberState((prev) => ({ ...prev, [k]: { ...prev[k], ...patch } }));

  const toggleExpanded = (k: string) => setExpanded((prev) => ({ ...prev, [k]: !prev[k] }));
  const expandAll = () => {
    const next: Record<string, boolean> = {};
    members.forEach((m) => { next[m.key] = true; });
    setExpanded(next);
  };
  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    members.forEach((m) => { next[m.key] = false; });
    setExpanded(next);
  };

  const dateObj = useMemo(() => {
    try { return parseISO(date); } catch { return new Date(date); }
  }, [date]);
  const weekday = format(dateObj, "EEEE", { locale: ptBR });
  const dateLong = format(dateObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const initialsOf = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "?";
  const filledCount = members.filter((m) => m.filled).length;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[calc(100vw-2rem)] max-h-[94vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 pr-12 border-b">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                <Play className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg leading-tight">Daily em Andamento</DialogTitle>
                <DialogDescription className="flex items-center gap-1.5 mt-0.5 text-xs">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="capitalize">{weekday}</span>
                  <span>•</span>
                  <span>{dateLong}</span>
                  {lastRefresh && (
                    <>
                      <span>•</span>
                      <span className="text-muted-foreground">Atualizado {format(lastRefresh, "HH:mm:ss")}</span>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="rounded-lg gap-1 font-normal">
                <span className="text-muted-foreground">Presença</span>
                <span className="font-semibold text-foreground">{filledCount}/{members.length}</span>
              </Badge>
              {stats.absent > 0 && (
                <Badge variant="outline" className="rounded-lg gap-1 font-normal border-red-500/40 text-red-600 bg-red-500/5">
                  <CalendarX className="w-3 h-3" />
                  <span className="font-semibold">{stats.absent}</span>
                </Badge>
              )}
              {stats.noPart > 0 && (
                <Badge variant="outline" className="rounded-lg gap-1 font-normal border-amber-500/40 text-amber-700 bg-amber-500/5">
                  <UserMinus className="w-3 h-3" />
                  <span className="font-semibold">{stats.noPart}</span>
                </Badge>
              )}
              <Badge variant="outline" className="rounded-lg gap-1 font-normal">
                <Video className="w-3 h-3" />
                <span className="font-semibold">{stats.cam}/{stats.total}</span>
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="rounded-lg h-8 gap-1.5 ml-1"
                title="Recarregar entradas e impedimentos dos devs"
              >
                <RefreshCcw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Atualizar</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Colaboradores</Label>
              <div className="h-px flex-1 bg-border" />
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={expandAll} className="h-7 text-xs gap-1">
                  <ChevronsUpDown className="w-3 h-3" /> Expandir todos
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={collapseAll} className="h-7 text-xs">
                  Retrair todos
                </Button>
              </div>
            </div>
            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1 -mr-1">
              {members.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum membro encontrado para esta squad.</p>
              )}
              {members.map((m) => {
                const st = memberState[m.key] ?? defaultState(m.filled);
                // Impedimentos visíveis no dia da daily: criados até D e ainda em aberto,
                // ou sanados no próprio dia. m.imps já vem filtrado por impsByUser.
                const dayImps = m.imps;
                const openImps = dayImps.filter((i) => !i.resolved);
                const noteCount = st.notes.trim().length;
                const isOpen = expanded[m.key] ?? false;
                const isAbsent = st.status === "absent_work";
                const isNoPart = st.status === "no_participate";
                const isPresent = st.status === "present";
                return (
                  <Card
                    key={m.key}
                    className={`rounded-xl overflow-hidden transition-all ${
                      isAbsent
                        ? "border-red-500/40 bg-red-500/[0.03]"
                        : isNoPart
                        ? "border-amber-500/40 bg-amber-500/[0.03]"
                        : m.filled
                        ? "border-border/70"
                        : "border-dashed bg-muted/20"
                    } ${openImps.length > 0 && isPresent ? "border-l-4 border-l-orange-500" : ""}`}
                  >
                    <CardContent className="p-0">
                      {/* Cabeçalho compacto — sempre visível */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleExpanded(m.key)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpanded(m.key); } }}
                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <div className="text-muted-foreground shrink-0">
                          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                            isAbsent
                              ? "bg-red-500/10 text-red-600"
                              : isNoPart
                              ? "bg-amber-500/10 text-amber-700"
                              : m.filled
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {initialsOf(m.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-sm leading-tight">{m.name}</span>
                            {m.filled ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                Preencheu
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] gap-1 border-border/60 text-muted-foreground">
                                <UserX className="w-2.5 h-2.5" /> Não preencheu
                              </Badge>
                            )}
                            {isPresent && openImps.length > 0 && (
                              <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/30 gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {openImps.length} {openImps.length > 1 ? "impedimentos" : "impedimento"}
                              </Badge>
                            )}
                          </div>
                          {isNoPart && st.absence_reason.trim() && !isOpen && (
                            <p className="text-[11px] text-amber-700/90 mt-1 truncate">
                              Motivo: {st.absence_reason}
                            </p>
                          )}
                        </div>
                        {/* Ações à direita, na mesma linha do nome */}
                        <div
                          className="flex items-center gap-1.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ToggleGroup
                            type="single"
                            value={st.status}
                            onValueChange={(v) => { if (v) updateMember(m.key, { status: v as MemberStatus }); }}
                            className="rounded-lg border bg-background p-0.5"
                          >
                            <ToggleGroupItem
                              value="present"
                              size="sm"
                              title="Presente"
                              className="h-7 px-2 gap-1 text-xs data-[state=on]:bg-emerald-500/10 data-[state=on]:text-emerald-700"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </ToggleGroupItem>
                            <ToggleGroupItem
                              value="absent_work"
                              size="sm"
                              title="Ausente do trabalho"
                              className="h-7 px-2 gap-1 text-xs data-[state=on]:bg-red-500/10 data-[state=on]:text-red-600"
                            >
                              <CalendarX className="w-3.5 h-3.5" />
                            </ToggleGroupItem>
                            <ToggleGroupItem
                              value="no_participate"
                              size="sm"
                              title="Não participou da daily"
                              className="h-7 px-2 gap-1 text-xs data-[state=on]:bg-amber-500/10 data-[state=on]:text-amber-700"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </ToggleGroupItem>
                          </ToggleGroup>
                          {isPresent && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                title={st.camera_on ? "Câmera ligada" : "Câmera desligada"}
                                onClick={() => updateMember(m.key, { camera_on: !st.camera_on })}
                                className={`h-8 w-8 rounded-lg ${st.camera_on ? "bg-primary/10 text-primary border-primary/40" : "text-muted-foreground"}`}
                              >
                                {st.camera_on ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                              </Button>
                            </>
                          )}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                title="Observação do líder"
                                className={`h-8 w-8 rounded-lg relative ${noteCount > 0 ? "bg-primary/10 text-primary border-primary/40" : "text-muted-foreground"}`}
                              >
                                <MessageSquarePlus className="w-3.5 h-3.5" />
                                {noteCount > 0 && (
                                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="end"
                              className="w-80"
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block flex items-center gap-1">
                                <MessageSquarePlus className="w-3 h-3" /> Observação sobre {m.name.split(" ")[0]}
                              </Label>
                              <Textarea
                                rows={4}
                                value={st.notes}
                                onChange={(e) => updateMember(m.key, { notes: e.target.value })}
                                placeholder="Opcional — algo específico deste colaborador..."
                                className="text-sm"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="px-3 pb-3 pt-1 space-y-3 border-t bg-background/40">
                          {isNoPart && (
                            <div>
                              <Label className="text-[11px] font-semibold text-amber-700 mb-1 block">
                                Motivo da não participação <span className="text-orange-500">*</span>
                              </Label>
                              <Textarea
                                rows={2}
                                value={st.absence_reason}
                                onChange={(e) => updateMember(m.key, { absence_reason: e.target.value })}
                                placeholder="Ex.: reunião com cliente, treinamento, atendimento urgente..."
                                className="text-sm"
                              />
                            </div>
                          )}

                          {isPresent && (
                            <>
                              {/* Ontem/Hoje */}
                              {m.filled && m.entry ? (
                                <>
                                  <div className="flex justify-end">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 rounded-lg gap-1 text-xs"
                                      onClick={() =>
                                        setHistoryFor({ userId: m.entry!.user_id, name: m.name })
                                      }
                                    >
                                      <History className="w-3 h-3" /> Ver histórico do dev
                                    </Button>
                                  </div>
                                  {(() => {
                                    const D = date;
                                    const userActs = userActivities.filter((a) => a.user_id === m.entry!.user_id);
                                    const done = userActs.filter(
                                      (a) => a.status === "concluida" && a.closed_entry_id === m.entry!.id,
                                    );
                                    const inactive = userActs.filter(
                                      (a) => a.status === "inativa" && a.closed_entry_id === m.entry!.id,
                                    );
                                    // Carry-over que continua pendente após esta daily.
                                    const stillPending = userActs.filter((a) => {
                                      if (a.closed_entry_id === m.entry!.id) return false;
                                      const origin = a.created_entry_id
                                        ? userEntriesAll.find((e) => e.id === a.created_entry_id)
                                        : null;
                                      const originDate = origin?.entry_date ?? (a.created_at ? a.created_at.slice(0, 10) : null);
                                      if (!originDate || originDate >= D) return false;
                                      if (a.closed_entry_id) {
                                        const closed = userEntriesAll.find((e) => e.id === a.closed_entry_id);
                                        if (closed && closed.entry_date <= D) return false;
                                      }
                                      return true;
                                    });
                                    // Atividades planejadas para hoje (registradas nesta entry, ainda pendentes).
                                    const pending = userActs.filter(
                                      (a) => a.status === "pendente" && a.created_entry_id === m.entry!.id,
                                    );
                                    return (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <div className="rounded-lg bg-muted/40 px-3 py-2">
                                          <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1">Ontem</p>
                                          {done.length + inactive.length + stillPending.length > 0 ? (
                                            <div className="space-y-1.5">
                                              {done.map((a) => (
                                                <DevActivityCard key={a.id} kind="done" description={a.description} createdAt={a.created_at} devNotes={a.dev_notes} />
                                              ))}
                                              {inactive.map((a) => (
                                                <DevActivityCard key={a.id} kind="inactive" description={a.description} createdAt={a.created_at} devNotes={a.dev_notes} />
                                              ))}
                                              {stillPending.map((a) => (
                                                <DevActivityCard key={a.id} kind="pending" description={a.description} createdAt={a.created_at} devNotes={a.dev_notes} />
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words">{m.entry!.did_yesterday || "—"}</p>
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
                                            <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words">{m.entry!.will_do_today || "—"}</p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                  {/* Observações gerais do dev */}
                                  <div className="rounded-lg border bg-muted/20 px-3 py-2">
                                    <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                                      <MessageSquarePlus className="w-3 h-3" /> Observações gerais do dev
                                    </p>
                                    {m.entry!.general_notes?.trim() ? (
                                      <p className="text-xs whitespace-pre-wrap break-words text-foreground/90">{m.entry!.general_notes}</p>
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">Nenhuma observação geral registrada.</p>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground text-center">
                                  Colaborador ainda não registrou a daily. Clique em <span className="font-semibold">Atualizar</span> após ele preencher.
                                </div>
                              )}

                              {/* Impedimentos em aberto criados neste registro */}
                              {openImps.length > 0 && (
                                <div className="space-y-1.5">
                                  <p className="text-[10px] uppercase tracking-wide font-semibold text-orange-600">Impedimentos abertos</p>
                                  {openImps.map((imp) => (
                                    <div key={imp.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-orange-500/5 border border-orange-500/20">
                                      <AlertTriangle className="w-3.5 h-3.5 text-orange-600 mt-0.5 shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs whitespace-pre-wrap break-words text-foreground/90">{imp.description}</p>
                                        <Badge variant="outline" className={`text-[10px] mt-1 ${URGENCY_STYLES[imp.urgency]}`}>
                                          {URGENCY_LABELS[imp.urgency]}
                                        </Badge>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 rounded-lg gap-1 text-xs border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 shrink-0"
                                        onClick={() => resolve.mutate({ id: imp.id, resolved: true })}
                                        disabled={resolve.isPending}
                                      >
                                        <CheckCircle2 className="w-3 h-3" /> Sanar
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Impedimentos sanados neste registro */}
                              {(() => {
                                // Impedimentos criados neste registro que já foram sanados.
                                const resolvedImps = dayImps.filter((i) => i.resolved);
                                if (resolvedImps.length === 0) return null;
                                return (
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] uppercase tracking-wide font-semibold text-emerald-600">Impedimentos sanados</p>
                                    {resolvedImps.map((imp) => (
                                      <div key={imp.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs whitespace-pre-wrap break-words text-foreground/90">{imp.description}</p>
                                          <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className={`text-[10px] ${URGENCY_STYLES[imp.urgency]}`}>
                                              {URGENCY_LABELS[imp.urgency]}
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
                                );
                              })()}
                            </>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <div className="flex items-center gap-2 flex-1">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Observações da reunião</Label>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="flex items-center gap-2">
                {transcriptUrl && (
                  <div className="flex items-center gap-1.5 text-xs rounded-lg bg-muted/50 px-2 py-1">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    <a href={transcriptUrl} target="_blank" rel="noreferrer" className="text-primary underline max-w-[160px] truncate">{transcriptName}</a>
                    <button type="button" onClick={() => { setTranscriptUrl(null); setTranscriptName(null); }} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                  </div>
                )}
                <Button type="button" variant="outline" size="sm" className="rounded-lg gap-1.5 h-8" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Paperclip className="w-3.5 h-3.5" />
                  {uploading ? "Enviando..." : transcriptUrl ? "Trocar transcrição" : "Anexar transcrição"}
                </Button>
                <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
            </div>
            <Textarea rows={4} value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Decisões, próximos passos, comentários..." />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/20">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
          <Button onClick={submit} disabled={create.isPending || members.length === 0} className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white gap-2">
            {create.isPending ? (
              <><RefreshCcw className="w-4 h-4 animate-spin" /> Salvando...</>
            ) : (
              <><Play className="w-4 h-4" /> Salvar Daily</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <DevHistoryModal
      open={!!historyFor}
      onOpenChange={(v) => { if (!v) setHistoryFor(null); }}
      userId={historyFor?.userId ?? null}
      name={historyFor?.name ?? ""}
    />
    </>
  );
}
