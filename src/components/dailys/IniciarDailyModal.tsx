import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, X, Play, AlertTriangle, MessageSquarePlus, UserX, Paperclip, CheckCircle2, Video, VideoOff, MicOff, Mic, Calendar } from "lucide-react";
import { uploadAttachment } from "@/lib/uploadAttachment";
import { useCreateDailyMeeting } from "@/hooks/useDailyMeetings";
import { useImpedimentMutations, URGENCY_LABELS, URGENCY_STYLES, type DevDailyImpediment } from "@/hooks/useDevDailyImpediments";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export function IniciarDailyModal({ open, onOpenChange, date, squadId, members }: Props) {
  const create = useCreateDailyMeeting();
  const { resolve } = useImpedimentMutations();
  const fileRef = useRef<HTMLInputElement>(null);

  const [observations, setObservations] = useState("");
  const [transcriptUrl, setTranscriptUrl] = useState<string | null>(null);
  const [transcriptName, setTranscriptName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [memberState, setMemberState] = useState<Record<string, { camera_on: boolean; stayed_silent: boolean; notes: string }>>({});

  useEffect(() => {
    if (open) {
      setObservations("");
      setTranscriptUrl(null);
      setTranscriptName(null);
      const init: Record<string, { camera_on: boolean; stayed_silent: boolean; notes: string }> = {};
      members.forEach((m) => { init[m.key] = { camera_on: m.filled, stayed_silent: false, notes: "" }; });
      setMemberState(init);
    }
  }, [open, members]);

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
      cam: vals.filter((v) => v.camera_on).length,
      silent: vals.filter((v) => v.stayed_silent).length,
    };
  }, [memberState]);

  const submit = async () => {
    await create.mutateAsync({
      meeting_date: date,
      squad_id: squadId,
      observations,
      transcript_url: transcriptUrl,
      attendance: members.map((m) => ({
        member_name: m.name,
        member_user_id: m.entry?.user_id ?? null,
        camera_on: memberState[m.key]?.camera_on ?? false,
        stayed_silent: memberState[m.key]?.stayed_silent ?? false,
        dev_entry_id: m.entry?.id ?? null,
        notes: memberState[m.key]?.notes?.trim() || null,
      })),
    });
    onOpenChange(false);
  };

  const updateMember = (k: string, patch: Partial<{ camera_on: boolean; stayed_silent: boolean; notes: string }>) =>
    setMemberState((prev) => ({ ...prev, [k]: { ...prev[k], ...patch } }));

  const dateObj = useMemo(() => {
    try { return parseISO(date); } catch { return new Date(date); }
  }, [date]);
  const weekday = format(dateObj, "EEEE", { locale: ptBR });
  const dateLong = format(dateObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const initialsOf = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "?";
  const filledCount = members.filter((m) => m.filled).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 pr-12 border-b">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                <Play className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg leading-tight">Iniciar Daily</DialogTitle>
                <DialogDescription className="flex items-center gap-1.5 mt-0.5 text-xs">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="capitalize">{weekday}</span>
                  <span>•</span>
                  <span>{dateLong}</span>
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="rounded-lg gap-1 font-normal">
                <span className="text-muted-foreground">Presença</span>
                <span className="font-semibold text-foreground">{filledCount}/{members.length}</span>
              </Badge>
              <Badge variant="outline" className="rounded-lg gap-1 font-normal">
                <Video className="w-3 h-3" />
                <span className="font-semibold">{stats.cam}/{stats.total}</span>
              </Badge>
              <Badge
                variant="outline"
                className={`rounded-lg gap-1 font-normal ${stats.silent > 0 ? "border-orange-500/40 text-orange-600 bg-orange-500/5" : ""}`}
              >
                <MicOff className="w-3 h-3" />
                <span className="font-semibold">{stats.silent}</span>
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Colaboradores</Label>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1 -mr-1">
              {members.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum membro encontrado para esta squad.</p>
              )}
              {members.map((m) => {
                const st = memberState[m.key] ?? { camera_on: false, stayed_silent: false, notes: "" };
                const openImps = m.imps.filter((i) => !i.resolved);
                const noteCount = st.notes.trim().length;
                return (
                  <Card
                    key={m.key}
                    className={`rounded-xl overflow-hidden transition-colors ${
                      m.filled
                        ? "border-border/70"
                        : "border-dashed bg-muted/20"
                    } ${openImps.length > 0 ? "border-l-4 border-l-orange-500" : ""}`}
                  >
                    <CardContent className="p-3.5 space-y-2.5">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                            m.filled
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
                            {openImps.length > 0 && (
                              <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/30 gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {openImps.length} {openImps.length > 1 ? "impedimentos" : "impedimento"}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => updateMember(m.key, { camera_on: !st.camera_on })}
                            className={`h-8 w-8 p-0 rounded-lg ${st.camera_on ? "bg-primary/10 text-primary hover:bg-primary/15" : "text-muted-foreground"}`}
                            title={st.camera_on ? "Câmera ligada" : "Câmera desligada"}
                          >
                            {st.camera_on ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => updateMember(m.key, { stayed_silent: !st.stayed_silent })}
                            className={`h-8 w-8 p-0 rounded-lg ${st.stayed_silent ? "bg-orange-500/10 text-orange-600 hover:bg-orange-500/15" : "text-muted-foreground"}`}
                            title={st.stayed_silent ? "Ficou em silêncio" : "Participou"}
                          >
                            {st.stayed_silent ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                          </Button>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                size="sm"
                                variant={noteCount > 0 ? "default" : "outline"}
                                className="rounded-lg gap-1.5 h-8 ml-1"
                              >
                                <MessageSquarePlus className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Observação</span>
                                {noteCount > 0 && <span className="text-[10px] opacity-80">({noteCount})</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 rounded-xl" align="end">
                              <Label className="text-xs font-semibold mb-1.5 block">Observação sobre {m.name}</Label>
                              <Textarea
                                rows={4}
                                value={st.notes}
                                onChange={(e) => updateMember(m.key, { notes: e.target.value })}
                                placeholder="Anote algo específico deste colaborador..."
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      {m.filled && m.entry && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-12">
                          <div className="rounded-lg bg-muted/40 px-3 py-2">
                            <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-0.5">Ontem</p>
                            <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words">{m.entry.did_yesterday || "—"}</p>
                          </div>
                          <div className="rounded-lg bg-primary/5 px-3 py-2">
                            <p className="text-[10px] uppercase tracking-wide font-semibold text-primary/80 mb-0.5">Hoje</p>
                            <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words">{m.entry.will_do_today || "—"}</p>
                          </div>
                        </div>
                      )}

                      {openImps.length > 0 && (
                        <div className="space-y-1.5 pl-12">
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
            <Play className="w-4 h-4" /> Salvar Daily
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
