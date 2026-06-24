import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, X, Play, AlertTriangle, MessageSquarePlus, CircleCheck, UserX, Paperclip, CheckCircle2 } from "lucide-react";
import { uploadAttachment } from "@/lib/uploadAttachment";
import { useCreateDailyMeeting } from "@/hooks/useDailyMeetings";
import { useImpedimentMutations, URGENCY_LABELS, URGENCY_STYLES, type DevDailyImpediment } from "@/hooks/useDevDailyImpediments";
import { toast } from "sonner";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Play className="w-5 h-5 text-orange-500" /> Iniciar Daily — {date}</DialogTitle>
          <DialogDescription>Conduza a reunião, registre observações por colaborador e sane impedimentos.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Colaboradores ({members.length})</Label>
              <div className="flex gap-2 text-xs">
                <Badge variant="outline">Câmeras: {stats.cam}/{stats.total}</Badge>
                <Badge variant="outline" className="border-orange-500 text-orange-500">Silêncio: {stats.silent}</Badge>
              </div>
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {members.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum membro encontrado para esta squad.</p>
              )}
              {members.map((m) => {
                const st = memberState[m.key] ?? { camera_on: false, stayed_silent: false, notes: "" };
                const openImps = m.imps.filter((i) => !i.resolved);
                const noteCount = st.notes.trim().length;
                return (
                  <Card key={m.key} className={`rounded-xl ${m.filled ? "" : "border-dashed bg-muted/20"}`}>
                    <CardContent className="py-3 px-4 space-y-2">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{m.name}</span>
                            {!m.filled && (
                              <Badge variant="outline" className="text-[10px] gap-1 border-border/60 text-muted-foreground">
                                <UserX className="w-2.5 h-2.5" /> Não preencheu
                              </Badge>
                            )}
                            {openImps.length > 0 && (
                              <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/30">
                                {openImps.length} impedimento{openImps.length > 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>
                          {m.filled && m.entry && (
                            <div className="mt-1 text-xs space-y-0.5">
                              <div><span className="text-muted-foreground">Ontem:</span> {m.entry.did_yesterday || "—"}</div>
                              <div><span className="text-muted-foreground">Hoje:</span> {m.entry.will_do_today || "—"}</div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                            <Checkbox checked={st.camera_on} onCheckedChange={(v) => updateMember(m.key, { camera_on: !!v })} />
                            Câmera
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                            <Checkbox checked={st.stayed_silent} onCheckedChange={(v) => updateMember(m.key, { stayed_silent: !!v })} />
                            Silente
                          </label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button size="sm" variant={noteCount > 0 ? "default" : "outline"} className="rounded-xl gap-1.5 h-8">
                                <MessageSquarePlus className="w-3.5 h-3.5" />
                                Observação{noteCount > 0 ? ` (${noteCount})` : ""}
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

                      {openImps.length > 0 && (
                        <div className="space-y-1.5 pt-1 border-t border-border/40">
                          {openImps.map((imp) => (
                            <div key={imp.id} className="flex items-start gap-2 p-2 rounded-lg bg-orange-500/5 border border-orange-500/20">
                              <AlertTriangle className="w-3.5 h-3.5 text-orange-600 mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                  <Badge variant="outline" className={`text-[10px] ${URGENCY_STYLES[imp.urgency]}`}>
                                    {URGENCY_LABELS[imp.urgency]}
                                  </Badge>
                                </div>
                                <p className="text-xs whitespace-pre-wrap break-words">{imp.description}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 rounded-lg gap-1 text-xs border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10"
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
            <Label className="mb-1.5 block">Observações da reunião</Label>
            <Textarea rows={4} value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Decisões, próximos passos, comentários..." />
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Label className="text-sm">Transcrição</Label>
            <div className="flex items-center gap-2">
              {transcriptUrl && (
                <div className="flex items-center gap-1.5 text-xs">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <a href={transcriptUrl} target="_blank" rel="noreferrer" className="text-primary underline max-w-[200px] truncate">{transcriptName}</a>
                  <button type="button" onClick={() => { setTranscriptUrl(null); setTranscriptName(null); }} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                </div>
              )}
              <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Paperclip className="w-3.5 h-3.5" />
                {uploading ? "Enviando..." : transcriptUrl ? "Trocar arquivo" : "Anexar transcrição"}
              </Button>
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
          <Button onClick={submit} disabled={create.isPending || members.length === 0} className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white gap-2">
            <Play className="w-4 h-4" /> Salvar Daily
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
