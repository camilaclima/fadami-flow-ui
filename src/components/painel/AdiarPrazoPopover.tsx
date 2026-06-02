import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarClock } from "lucide-react";
import { useUpdateActivity } from "@/hooks/useActivities";
import { toast } from "sonner";

export function AdiarPrazoPopover({ activityId }: { activityId: string | null }) {
  const [date, setDate] = useState("");
  const update = useUpdateActivity();
  const save = async () => {
    if (!activityId) { toast.error("Sem atividade vinculada"); return; }
    if (!date) return;
    await update.mutateAsync({ id: activityId, deadline_date: date, deadline: date } as any);
    toast.success("Prazo atualizado");
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2"><CalendarClock className="w-4 h-4" /> Adiar Prazo</Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-2">
          <p className="text-sm font-medium">Novo prazo</p>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button size="sm" onClick={save} className="w-full" disabled={!activityId || !date}>Salvar</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}