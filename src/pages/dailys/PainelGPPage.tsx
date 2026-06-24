import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Play, CheckCircle2, Clock, Users, RefreshCcw } from "lucide-react";
import { useSquads } from "@/hooks/useSquads";
import { useDevDailyEntriesByDate } from "@/hooks/useDevDailyEntries";
import { useGenerateDailyInsights, type DailyInsight } from "@/hooks/useDailyInsights";
import { useProfiles } from "@/hooks/useProfiles";
import { IniciarDailyModal } from "@/components/dailys/IniciarDailyModal";

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function PainelGPPage() {
  const [date, setDate] = useState<string>(todayISO());
  const [squadId, setSquadId] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [insights, setInsights] = useState<DailyInsight[]>([]);

  const { data: squads = [] } = useSquads();
  const { data: profiles = [] } = useProfiles();
  const { data: entries = [], isLoading } = useDevDailyEntriesByDate(date, squadId);
  const gen = useGenerateDailyInsights();

  const profileByUser = useMemo(() => {
    const m = new Map<string, any>();
    profiles.forEach((p: any) => m.set(p.user_id, p));
    return m;
  }, [profiles]);

  const rows = useMemo(() => {
    return entries.map(e => {
      const p = profileByUser.get(e.user_id);
      const name = p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email : e.user_id;
      return { ...e, dev_name: name };
    });
  }, [entries, profileByUser]);

  const handleGenerate = async () => {
    const result = await gen.mutateAsync(rows.map(r => ({
      dev_name: r.dev_name,
      did_yesterday: r.did_yesterday ?? "",
      will_do_today: r.will_do_today ?? "",
      impediments: r.impediments ?? "",
    })));
    setInsights(result);
  };

  return (
    <div className="p-4 md:p-6 w-full max-w-[1400px] mx-auto">
      <div className="mb-6 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Painel do Analista / GP</h1>
          <p className="text-sm text-muted-foreground">Acompanhe quem preencheu e conduza a daily com insights da IA.</p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <Label className="mb-1.5">Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[170px]" />
          </div>
          <div>
            <Label className="mb-1.5">Squad</Label>
            <Select value={squadId ?? "__all__"} onValueChange={(v) => setSquadId(v === "__all__" ? null : v)}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as squads</SelectItem>
                {squads.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setOpenModal(true)} className="rounded-xl gap-2 bg-orange-500 hover:bg-orange-600 text-white">
            <Play className="w-4 h-4" /> Iniciar Daily
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="rounded-2xl">
          <CardContent className="pt-5 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <div><div className="text-2xl font-bold">{rows.length}</div><div className="text-xs text-muted-foreground">Devs preencheram</div></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="pt-5 flex items-center gap-3">
            <Clock className="w-8 h-8 text-orange-500" />
            <div><div className="text-2xl font-bold">{rows.filter(r => (r.impediments ?? "").trim().length > 0).length}</div><div className="text-xs text-muted-foreground">Com impedimento</div></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="pt-5 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <div><div className="text-2xl font-bold">{insights.length}</div><div className="text-xs text-muted-foreground">Insights de IA gerados</div></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> Status de preenchimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
            {!isLoading && rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhum registro para a data.</p>}
            {rows.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-hover/40">
                <div>
                  <div className="text-sm font-medium">{r.dev_name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{r.will_do_today || "Sem plano informado"}</div>
                </div>
                <div className="flex items-center gap-2">
                  {(r.impediments ?? "").trim() && <Badge variant="outline" className="border-orange-500 text-orange-500">Impedimento</Badge>}
                  <Badge className="bg-emerald-500/15 text-emerald-600">Preencheu</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Insights da IA</CardTitle>
            <Button size="sm" variant="outline" className="rounded-xl gap-2" onClick={handleGenerate} disabled={gen.isPending || rows.length === 0}>
              <RefreshCcw className={`w-3.5 h-3.5 ${gen.isPending ? "animate-spin" : ""}`} />
              {insights.length ? "Regenerar" : "Gerar perguntas"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.length === 0 && (
              <p className="text-sm text-muted-foreground">Clique em <b>Gerar perguntas</b> para receber sugestões para cada dev.</p>
            )}
            {insights.map((it, i) => (
              <div key={i} className="p-3 rounded-xl border border-border/60 bg-card">
                <div className="text-sm font-semibold mb-1.5">{it.dev_name}</div>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  {it.suggested_questions.map((q, j) => <li key={j}>{q}</li>)}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <IniciarDailyModal
        open={openModal}
        onOpenChange={setOpenModal}
        date={date}
        squadId={squadId}
        entries={rows}
      />
    </div>
  );
}
