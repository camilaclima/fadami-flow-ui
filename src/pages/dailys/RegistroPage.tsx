import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardEdit, AlertTriangle, CheckCircle2, Calendar, Plus, Users } from "lucide-react";
import { useDevDailyEntriesByUser, useUpsertDevDailyEntry } from "@/hooks/useDevDailyEntries";
import { useDailySim } from "@/contexts/DailySimContext";
import { AccessDeniedCard } from "@/components/dailys/AccessDeniedCard";
import { format, parseISO, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

function toISO(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** Datas permitidas: hoje + dia útil anterior (segunda → sexta). */
function allowedDates(): { value: string; label: string }[] {
  const today = new Date();
  const dow = today.getDay(); // 0=dom, 6=sáb
  const prev = dow === 1 ? subDays(today, 3) : dow === 0 ? subDays(today, 2) : subDays(today, 1);
  const opts = [
    { value: toISO(today), label: `Hoje — ${format(today, "EEEE, dd/MM", { locale: ptBR })}` },
    { value: toISO(prev), label: `Ontem útil — ${format(prev, "EEEE, dd/MM", { locale: ptBR })}` },
  ];
  // Remove sáb/dom de "hoje" se aplicável
  return opts.filter((o) => {
    const d = parseISO(o.value).getDay();
    return d !== 0 && d !== 6;
  });
}

function useMySquadNames(squadIds: string[] | null | undefined) {
  return useQuery({
    queryKey: ["my-squad-names", (squadIds ?? []).join(",")],
    enabled: !!squadIds && squadIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from("squads") as any)
        .select("id,name")
        .in("id", squadIds!);
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });
}

export default function RegistroPage() {
  const { current: sim } = useDailySim();
  const { data: entries = [], isLoading } = useDevDailyEntriesByUser(sim.devUserId);
  const { data: squads = [] } = useMySquadNames(sim.squadIds);
  const upsert = useUpsertDevDailyEntry();

  const dateOptions = useMemo(() => allowedDates(), []);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<string>(dateOptions[0]?.value ?? toISO(new Date()));
  const [didYesterday, setDidYesterday] = useState("");
  const [willDoToday, setWillDoToday] = useState("");
  const [impediments, setImpediments] = useState("");
  const [touched, setTouched] = useState({ did: false, will: false });

  const existing = useMemo(() => entries.find((e) => e.entry_date === date), [entries, date]);

  useEffect(() => {
    if (open) {
      setDidYesterday(existing?.did_yesterday ?? "");
      setWillDoToday(existing?.will_do_today ?? "");
      setImpediments(existing?.impediments ?? "");
      setTouched({ did: false, will: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing?.id, date]);

  const didEmpty = !didYesterday.trim();
  const willEmpty = !willDoToday.trim();

  const submit = async () => {
    setTouched({ did: true, will: true });
    if (didEmpty || willEmpty) {
      toast.error("Preencha os campos obrigatórios: 'O que fiz ontem?' e 'O que farei hoje?'.");
      return;
    }
    await upsert.mutateAsync({
      id: existing?.id,
      entry_date: date,
      squad_id: sim.squadIds?.[0] ?? null,
      did_yesterday: didYesterday,
      will_do_today: willDoToday,
      impediments,
    });
    setOpen(false);
  };

  if (sim.role !== "dev") {
    return (
      <AccessDeniedCard message="A área 'Minha Daily' é exclusiva para Desenvolvedores." />
    );
  }

  return (
    <div className="p-4 md:p-6 w-full max-w-[1100px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Minha Daily — {sim.personName ?? ""}</h1>
        <p className="text-sm text-muted-foreground">Registre seu status diário e acompanhe o histórico.</p>
        {squads.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5" /> Squad{squads.length > 1 ? "s" : ""}:
            </span>
            {squads.map((s) => (
              <Badge key={s.id} variant="secondary">
                {s.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="mb-5 flex justify-end">
        <Button onClick={() => { setDate(dateOptions[0]?.value ?? toISO(new Date())); setOpen(true); }} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Registrar daily
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!isLoading && entries.length === 0 && (
          <Card className="rounded-2xl">
            <CardContent className="py-10 text-center text-muted-foreground">Nenhum registro ainda.</CardContent>
          </Card>
        )}
        {entries.map((e) => (
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardEdit className="w-5 h-5 text-primary" />
              Registrar daily
              {existing && <Badge variant="outline" className="ml-2">Editando</Badge>}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <Label className="mb-1.5 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Data de referência</Label>
              <Select value={date} onValueChange={setDate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {dateOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1.5">O que fiz ontem? <span className="text-orange-500">*</span></Label>
              <Textarea
                rows={4}
                value={didYesterday}
                onChange={(e) => { setDidYesterday(e.target.value); setTouched((p) => ({ ...p, did: true })); }}
                placeholder="Tarefas, entregas, descobertas..."
                className={touched.did && didEmpty ? "border-orange-500 focus-visible:ring-orange-500" : ""}
              />
              {touched.did && didEmpty && <p className="text-xs text-orange-500 mt-1">Campo obrigatório.</p>}
            </div>

            <div>
              <Label className="mb-1.5">O que farei hoje? <span className="text-orange-500">*</span></Label>
              <Textarea
                rows={4}
                value={willDoToday}
                onChange={(e) => { setWillDoToday(e.target.value); setTouched((p) => ({ ...p, will: true })); }}
                placeholder="Próximos passos planejados..."
                className={touched.will && willEmpty ? "border-orange-500 focus-visible:ring-orange-500" : ""}
              />
              {touched.will && willEmpty && <p className="text-xs text-orange-500 mt-1">Campo obrigatório.</p>}
            </div>

            <div>
              <Label className="mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Há algum impedimento? <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Textarea rows={3} value={impediments} onChange={(e) => setImpediments(e.target.value)} placeholder="Bloqueios, dependências, dúvidas..." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={submit} disabled={upsert.isPending} className="rounded-xl gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {existing ? "Atualizar" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
