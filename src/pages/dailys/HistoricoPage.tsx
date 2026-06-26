import { useMemo, useState } from "react";
import { format, differenceInHours, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarCheck, AlertOctagon, Download, Sparkles, TrendingUp, AlertTriangle, Flame,
  CheckCircle2, Pencil, Lock, History,
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { useActiveProducts } from "@/hooks/useProducts";
import { useSprints } from "@/hooks/useSprints";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useAuthorizedProducts } from "@/hooks/useAuthorizedProducts";
import { EditDailyDialog } from "@/components/daily/EditDailyDialog";
import { downloadDailyReportPdf, parseRawReport } from "@/lib/dailyReportPdf";

interface AIRecorrencia { descricao: string; dias_consecutivos: number; responsavel?: string; }
interface AIInsights {
  avancos: string[];
  riscos: string[];
  recorrencias: AIRecorrencia[];
  status_geral?: "saudavel" | "atencao" | "critico";
  resumo_executivo?: string;
  resumo_curto?: string;
  proximos_passos?: string[];
}

interface DailyRow {
  id: string;
  product_id: string;
  sprint_id: string;
  sprint_label?: string;
  status_date: string;
  present_member_ids: string[];
  summary: string;
  blocker_level: number;
  ai_insights: AIInsights | null;
  created_at: string;
}

/** Conta impedimentos a partir do summary bruto (linhas "Impedimentos: a | b | c"). */
function countImpediments(summary: string): number {
  if (!summary) return 0;
  const blocks = parseRawReport(summary);
  let total = 0;
  for (const b of blocks) {
    const m = b.text.match(/impedimentos?\s*:\s*([^\n]+)/i);
    if (!m) continue;
    const items = m[1].split("|").map((s) => s.trim()).filter((s) => {
      if (!s) return false;
      const low = s.toLowerCase();
      return low !== "—" && low !== "-" && !/^(nenhum|sem impedimento|n\/a)/i.test(low);
    });
    total += items.length;
  }
  return total;
}

export default function HistoricoPage() {
  const { data: allProducts = [] } = useActiveProducts();
  const { data: sprints = [] } = useSprints();
  const { data: teamMembers = [] } = useTeamMembers();
  const { isAdmin, productIds: allowedIds } = useAuthorizedProducts();

  const [selectedDaily, setSelectedDaily] = useState<DailyRow | null>(null);
  const [editingDaily, setEditingDaily] = useState<DailyRow | null>(null);

  const products = useMemo(
    () => isAdmin || !allowedIds ? allProducts : allProducts.filter((p) => allowedIds.includes(p.id)),
    [allProducts, allowedIds, isAdmin],
  );
  const viewProductIds = useMemo(() => products.map((p) => p.id), [products]);
  const productNameMap = useMemo(() => Object.fromEntries(allProducts.map((p) => [p.id, p.name])), [allProducts]);

  const { data: dailies = [], isLoading } = useQuery({
    queryKey: ["daily_status_history_painel", isAdmin ? "admin" : viewProductIds.join(",")],
    enabled: viewProductIds.length > 0 || isAdmin,
    queryFn: async () => {
      let q = (supabase.from("daily_status") as any)
        .select("*")
        .order("status_date", { ascending: false });
      if (!isAdmin) {
        if (viewProductIds.length === 0) return [] as DailyRow[];
        q = q.in("product_id", viewProductIds);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as DailyRow[];
    },
  });

  const sprintNameMap = useMemo(() => Object.fromEntries(sprints.map((s) => [s.id, s.name])), [sprints]);
  const memberNameMap = useMemo(() => Object.fromEntries(teamMembers.map((m) => [m.id, m.name])), [teamMembers]);

  const dailyNumberMap = useMemo(() => {
    const sortedAsc = [...dailies].sort((a, b) => a.status_date.localeCompare(b.status_date));
    const map: Record<string, number> = {};
    sortedAsc.forEach((d, i) => { map[d.id] = i + 1; });
    return map;
  }, [dailies]);

  const canEdit = (d: DailyRow) => differenceInHours(new Date(), new Date(d.created_at)) <= 72;

  const handleDownloadDaily = (d: DailyRow, e?: React.MouseEvent) => {
    e?.stopPropagation();
    downloadDailyReportPdf({
      productName: productNameMap[d.product_id] ?? "Projeto",
      dailyNumber: dailyNumberMap[d.id] ?? 0,
      statusDate: d.status_date,
      sprintLabel: d.sprint_label?.trim() || (sprintNameMap[d.sprint_id] ?? "—"),
      blockerLevel: d.blocker_level,
      presentMembers: (d.present_member_ids ?? []).map((id) => memberNameMap[id] ?? id),
      rawSummary: d.summary ?? "",
      insights: d.ai_insights,
    });
  };

  return (
    <div className="p-4 md:p-6 w-full max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><History className="w-6 h-6" /> Histórico de Dailies</h1>
        <p className="text-sm text-muted-foreground">Audite as reuniões já realizadas, com observações e métricas anexadas.</p>
      </div>

      <p className="text-xs text-muted-foreground mb-2">
        {isLoading ? "Carregando..." : `Mostrando ${dailies.length} daily(s).`}
      </p>

      <div className="space-y-2">
        {!isLoading && dailies.length === 0 && (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Nenhuma daily registrada.</CardContent></Card>
        )}
        {dailies.map((d) => {
          const resumo = d.ai_insights?.resumo_curto ?? d.ai_insights?.resumo_executivo ?? d.summary;
          const num = dailyNumberMap[d.id];
          const impCount = countImpediments(d.summary);
          return (
            <motion.div key={d.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              <Card
                onClick={() => setSelectedDaily(d)}
                className="cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-all"
              >
                <CardContent className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Badge className="flex-shrink-0 bg-primary/15 text-primary border-primary/30 hover:bg-primary/15">
                      Daily #{num}
                    </Badge>
                    <Badge variant="outline" className="flex-shrink-0">
                      {format(parseISO(d.status_date), "dd/MM/yyyy", { locale: ptBR })}
                    </Badge>
                    <Badge variant="secondary" className="flex-shrink-0 text-xs">
                      {d.sprint_label?.trim() ? d.sprint_label : (sprintNameMap[d.sprint_id] ?? "Sprint —")}
                    </Badge>
                    <p className="text-sm text-muted-foreground truncate italic">"{resumo}"</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs gap-1">
                      <AlertOctagon className="h-3 w-3" />
                      {impCount} {impCount === 1 ? "impedimento" : "impedimentos"}
                    </Badge>
                    <Button
                      size="icon" variant="ghost"
                      title="Baixar relatório PDF desta daily"
                      onClick={(e) => handleDownloadDaily(d, e)}
                      className="h-8 w-8"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <EditDailyDialog open={!!editingDaily} onOpenChange={(o) => !o && setEditingDaily(null)} daily={editingDaily} onSaved={() => setSelectedDaily(null)} />

      {/* Modal de detalhe da daily — espelha exatamente o de Registro de Dailys */}
      <Dialog open={!!selectedDaily} onOpenChange={(o) => !o && setSelectedDaily(null)}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] flex flex-col">
          {selectedDaily && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <DialogTitle className="flex items-center gap-2 flex-wrap">
                      <CalendarCheck className="h-5 w-5 text-primary" />
                      Daily #{dailyNumberMap[selectedDaily.id]} —{" "}
                      {format(parseISO(selectedDaily.status_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </DialogTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleDownloadDaily(selectedDaily)}>
                      <Download className="h-4 w-4 mr-2" /> Baixar PDF
                    </Button>
                    {canEdit(selectedDaily) ? (
                      <Button size="sm" variant="outline" onClick={() => setEditingDaily(selectedDaily)}>
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </Button>
                    ) : (
                      <Badge variant="outline" className="gap-1.5">
                        <Lock className="h-3 w-3" /> Somente leitura
                      </Badge>
                    )}
                  </div>
                </div>
                <DialogDescription className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{sprintNameMap[selectedDaily.sprint_id] ?? "Sprint —"}</Badge>
                  <Badge variant="outline" className="gap-1">
                    <Sparkles className="h-3 w-3" /> Bloqueio IA {selectedDaily.blocker_level}/5
                  </Badge>
                  {(selectedDaily.present_member_ids ?? []).length > 0 && (
                    <span className="text-xs">{(selectedDaily.present_member_ids ?? []).length} membro(s) presente(s)</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    · Criada em {format(new Date(selectedDaily.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="bruto" className="flex-1 flex flex-col min-h-0">
                <TabsList className="self-start">
                  <TabsTrigger value="bruto">Relatório Bruto</TabsTrigger>
                  <TabsTrigger value="ia">Análise da IA</TabsTrigger>
                </TabsList>
                <TabsContent value="bruto" className="flex-1 min-h-0">
                  <ScrollArea className="h-[55vh] pr-3">
                    <RawReportView
                      summary={selectedDaily.summary}
                      presentMembers={(selectedDaily.present_member_ids ?? []).map((id) => memberNameMap[id] ?? id)}
                    />
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="ia" className="flex-1 min-h-0">
                  <ScrollArea className="h-[55vh] pr-3">
                    {!selectedDaily.ai_insights ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">Esta daily não possui análise de IA.</p>
                    ) : (
                      <DailyAIDetail insights={selectedDaily.ai_insights} />
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RawReportView({ summary, presentMembers }: { summary: string; presentMembers: string[] }) {
  const blocks = parseRawReport(summary || "");
  const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  if (!summary?.trim()) return <p className="text-sm text-muted-foreground italic">Sem texto registrado.</p>;
  return (
    <div className="space-y-3">
      {presentMembers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presentMembers.map((n, i) => <Badge key={i} variant="secondary" className="text-xs">{n}</Badge>)}
        </div>
      )}
      <div className="space-y-2.5">
        {blocks.map((b, i) => {
          const isMeta = /observa|coordena/i.test(b.name);
          return (
            <Card key={i} className={cn("border-l-4", isMeta ? "border-l-amber-500/60 bg-amber-500/5" : "border-l-primary/60 bg-card/40")}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0",
                    isMeta ? "bg-amber-500/20 text-amber-700" : "bg-primary/15 text-primary")}>
                    {isMeta ? "📝" : initials(b.name)}
                  </div>
                  <CardTitle className="text-sm">{b.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">{b.text || "—"}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function DailyAIDetail({ insights }: { insights: AIInsights }) {
  return (
    <div className="space-y-4">
      {insights.resumo_executivo && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Resumo Executivo</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground italic">{insights.resumo_executivo}</p></CardContent>
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" /> Avanços</CardTitle></CardHeader>
          <CardContent>
            {insights.avancos.length === 0 ? <p className="text-xs text-muted-foreground">—</p> :
              <ul className="space-y-1.5">{insights.avancos.map((a, i) => <li key={i} className="text-xs flex gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-600 mt-0.5 flex-shrink-0" />{a}</li>)}</ul>}
          </CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Riscos</CardTitle></CardHeader>
          <CardContent>
            {insights.riscos.length === 0 ? <p className="text-xs text-muted-foreground">—</p> :
              <ul className="space-y-1.5">{insights.riscos.map((r, i) => <li key={i} className="text-xs flex gap-1.5"><AlertTriangle className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />{r}</li>)}</ul>}
          </CardContent>
        </Card>
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Flame className="h-4 w-4 text-red-600" /> Recorrências</CardTitle></CardHeader>
          <CardContent>
            {insights.recorrencias.length === 0 ? <p className="text-xs text-muted-foreground">—</p> :
              <ul className="space-y-1.5">{insights.recorrencias.map((r, i) => (
                <li key={i} className="text-xs">
                  <div className="flex items-start justify-between gap-1.5">
                    <span>{r.descricao}</span>
                    <Badge variant="destructive" className="text-[10px] flex-shrink-0">{r.dias_consecutivos}d</Badge>
                  </div>
                  {r.responsavel && <p className="text-[10px] text-muted-foreground">Resp: {r.responsavel}</p>}
                </li>
              ))}</ul>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}