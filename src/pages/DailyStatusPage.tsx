import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarCheck,
  CalendarIcon,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Flame,
  Star,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { useActiveProducts } from "@/hooks/useProducts";
import { useSprints } from "@/hooks/useSprints";
import { useTeamMembers } from "@/hooks/useTeamMembers";

interface AIRecorrencia {
  descricao: string;
  dias_consecutivos: number;
  responsavel?: string;
}
interface AIInsights {
  avancos: string[];
  riscos: string[];
  recorrencias: AIRecorrencia[];
  status_geral: "saudavel" | "atencao" | "critico";
  resumo_executivo: string;
}

interface DailyStatusRow {
  id: string;
  product_id: string | null;
  sprint_id: string;
  status_date: string;
  present_member_ids: string[];
  summary: string;
  blocker_level: number;
  ai_insights: AIInsights | null;
  created_at: string;
}

function useDailyHistory(productId: string | undefined) {
  return useQuery({
    queryKey: ["daily_status_history", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("daily_status") as any)
        .select("*")
        .eq("product_id", productId!)
        .order("status_date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as DailyStatusRow[];
    },
  });
}

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-1 transition-transform hover:scale-110"
          aria-label={`Nível ${n}`}
        >
          <Star
            className={cn(
              "h-6 w-6 transition-colors",
              n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
            )}
          />
        </button>
      ))}
      <span className="ml-2 text-sm text-muted-foreground">{value}/5</span>
    </div>
  );
}

function MultiMemberSelect({
  members,
  selected,
  onToggle,
}: {
  members: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 rounded-md border border-input bg-background p-3 min-h-[44px]">
      {members.length === 0 && (
        <span className="text-sm text-muted-foreground">Nenhum colaborador cadastrado</span>
      )}
      {members.map((m) => {
        const active = selected.includes(m.id);
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onToggle(m.id)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-all",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-accent border-border",
            )}
          >
            {active && <CheckCircle2 className="inline h-3 w-3 mr-1" />}
            {m.name}
          </button>
        );
      })}
    </div>
  );
}

const STATUS_LABEL: Record<AIInsights["status_geral"], { label: string; cls: string }> = {
  saudavel: { label: "Saudável", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  atencao: { label: "Atenção", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  critico: { label: "Crítico", cls: "bg-red-500/15 text-red-600 border-red-500/30" },
};

export default function DailyStatusPage() {
  const qc = useQueryClient();
  const { data: products = [] } = useActiveProducts();
  const { data: sprints = [] } = useSprints();
  const { data: teamMembers = [] } = useTeamMembers();

  const [productId, setProductId] = useState<string>("");
  const [sprintId, setSprintId] = useState<string>("");
  const [date, setDate] = useState<Date>(new Date());
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [summary, setSummary] = useState("");
  const [blockerLevel, setBlockerLevel] = useState(1);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(false);

  const sprintsForProduct = useMemo(
    () => sprints.filter((s) => !productId || s.product_id === productId),
    [sprints, productId],
  );

  const { data: history = [] } = useDailyHistory(productId);

  const toggleMember = (id: string) =>
    setSelectedMembers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const memberNameMap = Object.fromEntries(teamMembers.map((m) => [m.id, m.name]));

  const handleGenerate = async () => {
    if (!productId || !sprintId || !summary.trim()) {
      toast.error("Preencha projeto, sprint e o resumo da daily.");
      return;
    }
    setLoading(true);
    setInsights(null);
    try {
      const presentNames = selectedMembers.map((id) => memberNameMap[id] ?? id);
      const { data, error } = await supabase.functions.invoke("analyze-daily-status", {
        body: {
          todaySummary: summary,
          blockerLevel,
          presentMembers: presentNames,
          history: history.map((h) => ({
            status_date: h.status_date,
            summary: h.summary,
            blocker_level: h.blocker_level,
            ai_insights: h.ai_insights,
          })),
        },
      });
      if (error) throw error;
      const result = data?.insights as AIInsights;
      if (!result) throw new Error("Resposta vazia da IA");
      setInsights(result);

      const { error: insertErr } = await (supabase.from("daily_status") as any).insert({
        product_id: productId,
        sprint_id: sprintId,
        status_date: format(date, "yyyy-MM-dd"),
        present_member_ids: selectedMembers,
        summary,
        blocker_level: blockerLevel,
        ai_insights: result,
      });
      if (insertErr) throw insertErr;
      qc.invalidateQueries({ queryKey: ["daily_status_history", productId] });
      toast.success("Relatório gerado e salvo no histórico!");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
          <CalendarCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Status Diário</h1>
          <p className="text-sm text-muted-foreground">
            Registre a daily e receba uma análise inteligente com base no histórico do projeto.
          </p>
        </div>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nova Daily</CardTitle>
          <CardDescription>Preencha os dados do dia para gerar a análise da IA.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select value={productId} onValueChange={(v) => { setProductId(v); setSprintId(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sprint</Label>
              <Select value={sprintId} onValueChange={setSprintId} disabled={!productId}>
                <SelectTrigger><SelectValue placeholder={productId ? "Selecione" : "Escolha um projeto"} /></SelectTrigger>
                <SelectContent>
                  {sprintsForProduct.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "PPP", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Membros presentes</Label>
            <MultiMemberSelect
              members={teamMembers.map((m) => ({ id: m.id, name: m.name }))}
              selected={selectedMembers}
              onToggle={toggleMember}
            />
          </div>

          <div className="space-y-2">
            <Label>Resumo da Daily</Label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={6}
              placeholder="O que cada membro fez ontem, o que vai fazer hoje, impedimentos..."
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Nível de bloqueio da equipe</Label>
            <StarRating value={blockerLevel} onChange={setBlockerLevel} />
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              {history.length > 0
                ? `${history.length} daily(s) anteriores serão usadas como contexto.`
                : "Sem histórico — esta será a primeira daily registrada para este projeto."}
            </p>
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analisando...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Gerar Relatório com IA</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {insights && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Resumo Executivo</CardTitle>
                <CardDescription>{insights.resumo_executivo}</CardDescription>
              </div>
              <Badge className={cn("border", STATUS_LABEL[insights.status_geral].cls)}>
                {STATUS_LABEL[insights.status_geral].label}
              </Badge>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base">Avanços</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {insights.avancos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum avanço destacado.</p>
                ) : (
                  <ul className="space-y-2">
                    {insights.avancos.map((a, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-500/15 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base">Riscos</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {insights.riscos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum risco identificado.</p>
                ) : (
                  <ul className="space-y-2">
                    {insights.riscos.map((r, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-red-500/15 text-red-600">
                    <Flame className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base">Gargalos e Recorrências</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {insights.recorrencias.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma recorrência detectada.</p>
                ) : (
                  <ul className="space-y-3">
                    {insights.recorrencias.map((r, i) => (
                      <li key={i} className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium">{r.descricao}</span>
                          <Badge variant="destructive" className="flex-shrink-0">
                            {r.dias_consecutivos}º dia seguido
                          </Badge>
                        </div>
                        {r.responsavel && (
                          <p className="text-xs text-muted-foreground">Responsável: {r.responsavel}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico recente</CardTitle>
            <CardDescription>Últimas dailys registradas para este projeto.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.slice(0, 5).map((h) => (
              <div
                key={h.id}
                className="p-3 rounded-lg border border-border bg-muted/30 flex items-start justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {format(new Date(h.status_date), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Bloqueio {h.blocker_level}/5
                    </Badge>
                    {h.ai_insights?.status_geral && (
                      <Badge className={cn("border text-xs", STATUS_LABEL[h.ai_insights.status_geral].cls)}>
                        {STATUS_LABEL[h.ai_insights.status_geral].label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{h.summary}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}