import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserCog } from "lucide-react";
import { useDailySim } from "@/contexts/DailySimContext";

const ROLE_LABEL: Record<string, string> = { diretor: "Diretor", gp: "GP / Analista", dev: "Desenvolvedor" };
const ROLE_COLOR: Record<string, string> = {
  diretor: "bg-primary/15 text-primary border-primary/40",
  gp: "bg-orange-500/15 text-orange-500 border-orange-500/40",
  dev: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40",
};

export function SimUserSwitcher() {
  const { options, current, setCurrentId, loading } = useDailySim();

  return (
    <div className="mb-4 flex items-center gap-3 flex-wrap rounded-2xl border border-dashed border-orange-500/40 bg-orange-500/5 px-4 py-2.5">
      <UserCog className="w-4 h-4 text-orange-500" />
      <span className="text-xs font-semibold uppercase tracking-wider text-orange-600">
        Simular como usuário
      </span>
      <Select value={current.id} onValueChange={setCurrentId}>
        <SelectTrigger className="w-[360px] bg-background">
          <SelectValue placeholder={loading ? "Carregando..." : "Selecione"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Badge variant="outline" className={`uppercase text-[10px] ${ROLE_COLOR[current.role] ?? ""}`}>
        {ROLE_LABEL[current.role]}
      </Badge>
      <span className="text-[11px] text-muted-foreground ml-auto">
        O menu e os dados se reconstroem conforme o usuário simulado.
      </span>
    </div>
  );
}