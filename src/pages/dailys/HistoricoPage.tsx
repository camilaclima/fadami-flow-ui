import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { History, FileText, Camera, VolumeX } from "lucide-react";
import { useDailyMeetings, useDailyMeeting } from "@/hooks/useDailyMeetings";
import { useSquads } from "@/hooks/useSquads";
import { format, parseISO } from "date-fns";

export default function HistoricoPage() {
  const [squadId, setSquadId] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: squads = [] } = useSquads();
  const { data: meetings = [], isLoading } = useDailyMeetings({ squadId, from: from || undefined, to: to || undefined });
  const { data: detail } = useDailyMeeting(openId);

  const squadName = useMemo(() => {
    const m = new Map<string, string>();
    squads.forEach((s: any) => m.set(s.id, s.name));
    return (id: string | null) => (id ? m.get(id) ?? "—" : "—");
  }, [squads]);

  return (
    <div className="p-4 md:p-6 w-full max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><History className="w-6 h-6" /> Histórico de Dailies</h1>
        <p className="text-sm text-muted-foreground">Audite as reuniões já realizadas, com observações e métricas anexadas.</p>
      </div>

      <Card className="rounded-2xl mb-4">
        <CardContent className="pt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="mb-1.5">Squad</Label>
            <Select value={squadId ?? "__all__"} onValueChange={v => setSquadId(v === "__all__" ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {squads.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="mb-1.5">De</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
          <div><Label className="mb-1.5">Até</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!isLoading && meetings.length === 0 && (
          <Card className="rounded-2xl"><CardContent className="py-10 text-center text-muted-foreground">Nenhuma daily registrada.</CardContent></Card>
        )}
        {meetings.map(m => (
          <Card key={m.id} className="rounded-2xl cursor-pointer hover:bg-surface-hover/30 transition" onClick={() => setOpenId(m.id)}>
            <CardContent className="py-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="font-semibold">{format(parseISO(m.meeting_date), "PPP")}</div>
                <div className="text-xs text-muted-foreground">{squadName(m.squad_id)}</div>
              </div>
              <div className="flex items-center gap-2">
                {m.transcript_url && <Badge variant="outline" className="gap-1"><FileText className="w-3 h-3" /> Transcrição</Badge>}
                <Badge variant="outline">Ver detalhes</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!openId} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Daily {detail?.meeting?.meeting_date ? format(parseISO(detail.meeting.meeting_date), "PPP") : ""}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-1 text-sm">Observações</h3>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{detail.meeting?.observations || "—"}</p>
              </div>
              {detail.meeting?.transcript_url && (
                <a href={detail.meeting.transcript_url} target="_blank" rel="noreferrer" className="text-sm text-primary underline flex items-center gap-1.5"><FileText className="w-4 h-4" /> Abrir transcrição</a>
              )}
              <div>
                <h3 className="font-semibold mb-2 text-sm">Presença</h3>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40"><tr><th className="text-left px-3 py-2">Membro</th><th className="px-3 py-2 text-center"><Camera className="w-3.5 h-3.5 inline" /></th><th className="px-3 py-2 text-center"><VolumeX className="w-3.5 h-3.5 inline" /></th></tr></thead>
                    <tbody>
                      {detail.attendance.map(a => (
                        <tr key={a.id} className="border-t border-border/60">
                          <td className="px-3 py-2">{a.member_name}</td>
                          <td className="px-3 py-2 text-center">{a.camera_on ? "✅" : "—"}</td>
                          <td className="px-3 py-2 text-center">{a.stayed_silent ? "🔇" : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
