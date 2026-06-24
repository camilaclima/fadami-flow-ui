import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, X, Play, AlertTriangle } from "lucide-react";
import { uploadAttachment } from "@/lib/uploadAttachment";
import { useCreateDailyMeeting } from "@/hooks/useDailyMeetings";
import { toast } from "sonner";

interface EntryRow {
  id: string;
  user_id: string;
  dev_name: string;
  did_yesterday: string | null;
  will_do_today: string | null;
  impediments: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date: string;
  squadId: string | null;
  entries: EntryRow[];
}

export function IniciarDailyModal({ open, onOpenChange, date, squadId, entries }: Props) {
  const create = useCreateDailyMeeting();
  const [observations, setObservations] = useState("");
  const [transcriptUrl, setTranscriptUrl] = useState<string | null>(null);
  const [transcriptName, setTranscriptName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [attendance, setAttendance] = useState<Record<string, { camera_on: boolean; stayed_silent: boolean }>>({});

  useEffect(() => {
    if (open) {
      setObservations("");
      setTranscriptUrl(null);
      setTranscriptName(null);
      const init: Record<string, { camera_on: boolean; stayed_silent: boolean }> = {};
      entries.forEach(e => { init[e.id] = { camera_on: true, stayed_silent: false }; });
      setAttendance(init);
    }
  }, [open, entries]);

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

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const stats = useMemo(() => {
    const vals = Object.values(attendance);
    return {
      total: vals.length,
      cam: vals.filter(v => v.camera_on).length,
      silent: vals.filter(v => v.stayed_silent).length,
    };
  }, [attendance]);

  const submit = async () => {
    await create.mutateAsync({
      meeting_date: date,
      squad_id: squadId,
      observations,
      transcript_url: transcriptUrl,
      attendance: entries.map(e => ({
        member_name: e.dev_name,
        member_user_id: e.user_id,
        camera_on: attendance[e.id]?.camera_on ?? false,
        stayed_silent: attendance[e.id]?.stayed_silent ?? false,
        dev_entry_id: e.id,
      })),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Play className="w-5 h-5 text-orange-500" /> Iniciar Daily — {date}</DialogTitle>
          <DialogDescription>Conduza a reunião com os relatos concatenados, registre observações e marque presença.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <Label className="mb-2 block text-sm font-semibold">Relatos da equipe</Label>
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {entries.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum dev preencheu a daily para esta data.</p>
              )}
              {entries.map(e => (
                <Card key={e.id} className="rounded-xl">
                  <CardContent className="py-3 text-sm space-y-1">
                    <div className="font-semibold">{e.dev_name}</div>
                    <div><span className="text-muted-foreground">Ontem:</span> {e.did_yesterday || "—"}</div>
                    <div><span className="text-muted-foreground">Hoje:</span> {e.will_do_today || "—"}</div>
                    {(e.impediments ?? "").trim() && (
                      <div className="flex items-start gap-1.5 text-orange-600"><AlertTriangle className="w-3.5 h-3.5 mt-0.5" /> {e.impediments}</div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">Observações da reunião</Label>
            <Textarea rows={4} value={observations} onChange={e => setObservations(e.target.value)} placeholder="Decisões, próximos passos, comentários..." />
          </div>

          <div>
            <Label className="mb-1.5 block">Transcrição (arquivo)</Label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="border-2 border-dashed border-border rounded-xl p-5 text-center text-sm text-muted-foreground hover:bg-surface-hover/30 transition"
            >
              {transcriptUrl ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <a href={transcriptUrl} target="_blank" rel="noreferrer" className="text-primary underline">{transcriptName}</a>
                  <button type="button" onClick={() => { setTranscriptUrl(null); setTranscriptName(null); }} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-1">
                  <Upload className="w-5 h-5" />
                  <span>{uploading ? "Enviando..." : "Arraste o arquivo aqui ou clique para selecionar"}</span>
                  <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                </label>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Presença e engajamento audiovisual</Label>
              <div className="flex gap-2 text-xs">
                <Badge variant="outline">Câmeras: {stats.cam}/{stats.total}</Badge>
                <Badge variant="outline" className="border-orange-500 text-orange-500">Silêncio: {stats.silent}</Badge>
              </div>
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-3 py-2">Membro</th>
                    <th className="px-3 py-2 w-32 text-center">Câmera ligada</th>
                    <th className="px-3 py-2 w-32 text-center">Não falou</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id} className="border-t border-border/60">
                      <td className="px-3 py-2">{e.dev_name}</td>
                      <td className="px-3 py-2 text-center">
                        <Checkbox checked={attendance[e.id]?.camera_on ?? false} onCheckedChange={(v) => setAttendance(prev => ({ ...prev, [e.id]: { ...prev[e.id], camera_on: !!v, stayed_silent: prev[e.id]?.stayed_silent ?? false } }))} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Checkbox checked={attendance[e.id]?.stayed_silent ?? false} onCheckedChange={(v) => setAttendance(prev => ({ ...prev, [e.id]: { ...prev[e.id], stayed_silent: !!v, camera_on: prev[e.id]?.camera_on ?? false } }))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
          <Button onClick={submit} disabled={create.isPending || entries.length === 0} className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white gap-2">
            <Play className="w-4 h-4" /> Salvar Daily
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
