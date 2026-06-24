import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ClipboardEdit, History, AlertTriangle, CheckCircle2, Calendar } from "lucide-react";
import { useDevDailyEntriesByUser, useUpsertDevDailyEntry } from "@/hooks/useDevDailyEntries";
import { useDailySim } from "@/contexts/DailySimContext";
import { AccessDeniedCard } from "@/components/dailys/AccessDeniedCard";
import { format, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

function nextWorkdayISO(): string {
  const d = new Date();
  // Registro feito no dia anterior → padrão: amanhã
  let next = addDays(d, 1);
  // pula sábado/domingo
  while (next.getDay() === 0 || next.getDay() === 6) next = addDays(next, 1);
  return next.toISOString().slice(0, 10);
}

export default function RegistroPage() {
  const { current: sim } = useDailySim();
  const { data: entries = [], isLoading } = useDevDailyEntriesByUser(sim.devUserId);
  const upsert = useUpsertDevDailyEntry();

  const [date, setDate] = useState<string>(nextWorkdayISO());
  const [didYesterday, setDidYesterday] = useState("");
  const [willDoToday, setWillDoToday] = useState("");
  const [impediments, setImpediments] = useState("");

  const existing = useMemo(
    () => entries.find(e => e.entry_date === date),
    [entries, date]
  );

  // Preenche se já existir
  useMemo(() => {
    if (existing) {
      setDidYesterday(existing.did_yesterday ?? "");
      setWillDoToday(existing.will_do_today ?? "");
      setImpediments(existing.impediments ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id]);

  const submit = async () => {
    await upsert.mutateAsync({
      id: existing?.id,
      entry_date: date,
      did_yesterday: didYesterday,
      will_do_today: willDoToday,
      impediments,
    });
  };

  if (sim.role !== "dev") {
    return (
      <AccessDeniedCard message="A área 'Minha Daily' é exclusiva para Desenvolvedores. Selecione um perfil de Dev no seletor acima para visualizar." />
    );
  }

  return (
    <div className="p-4 md:p-6 w-full max-w-[1100px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Minha Daily — {sim.personName ?? ""}</h1>
        <p className="text-sm text-muted-foreground">Registre o seu status do dia anterior para preparar a reunião.</p>
      </div>

      <Tabs defaultValue="novo" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="novo" className="gap-2"><ClipboardEdit className="w-4 h-4" /> Novo Registro</TabsTrigger>
          <TabsTrigger value="historico" className="gap-2"><History className="w-4 h-4" /> Meu Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="novo">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardEdit className="w-5 h-5 text-primary" />
                Registro para {format(parseISO(date), "PPP", { locale: ptBR })}
                {existing && <Badge variant="outline" className="ml-2">Editando</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-1">
                  <Label className="mb-1.5 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Data de referência</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>

              <div>
                <Label className="mb-1.5">O que fiz ontem?</Label>
                <Textarea rows={4} value={didYesterday} onChange={(e) => setDidYesterday(e.target.value)} placeholder="Tarefas, entregas, descobertas..." />
              </div>
              <div>
                <Label className="mb-1.5">O que farei hoje?</Label>
                <Textarea rows={4} value={willDoToday} onChange={(e) => setWillDoToday(e.target.value)} placeholder="Próximos passos planejados..." />
              </div>
              <div>
                <Label className="mb-1.5 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-orange-500" /> Há algum impedimento?</Label>
                <Textarea rows={3} value={impediments} onChange={(e) => setImpediments(e.target.value)} placeholder="Bloqueios, dependências, dúvidas..." />
              </div>

              <div className="flex justify-end gap-2">
                <Button onClick={submit} disabled={upsert.isPending} className="rounded-xl gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {existing ? "Atualizar registro" : "Salvar registro"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <div className="space-y-3">
            {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
            {!isLoading && entries.length === 0 && (
              <Card className="rounded-2xl"><CardContent className="py-10 text-center text-muted-foreground">Nenhum registro ainda.</CardContent></Card>
            )}
            {entries.map(e => (
              <Card key={e.id} className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{format(parseISO(e.entry_date), "PPP", { locale: ptBR })}</span>
                    <Badge variant="outline">{format(parseISO(e.created_at), "dd/MM HH:mm")}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><span className="font-medium">Ontem:</span> <span className="text-muted-foreground whitespace-pre-wrap">{e.did_yesterday || "—"}</span></div>
                  <div><span className="font-medium">Hoje:</span> <span className="text-muted-foreground whitespace-pre-wrap">{e.will_do_today || "—"}</span></div>
                  <div><span className="font-medium text-orange-500">Impedimentos:</span> <span className="text-muted-foreground whitespace-pre-wrap">{e.impediments || "—"}</span></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
