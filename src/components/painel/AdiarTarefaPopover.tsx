import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CoordinatorTask } from "@/hooks/useCoordinatorTasks";

export function AdiarTarefaPopover({ task }: { task: CoordinatorTask }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const save = async () => {
    if (!date || !reason.trim()) {
      toast.error("Informe a nova data e o motivo");
      return;
    }
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const prev = Array.isArray((task as any).postponements) ? (task as any).postponements : [];
      const entry = {
        previous_date: task.deadline_date ?? null,
        new_date: date,
        reason: reason.trim(),
        postponed_at: new Date().toISOString(),
        postponed_by: u?.user?.id ?? null,
        postponed_by_email: u?.user?.email ?? null,
      };
      const { error } = await (supabase.from("coordinator_tasks") as any)
        .update({
          deadline_date: date,
          postponements: [...prev, entry],
          updated_by: u?.user?.id ?? null,
        })
        .eq("id", task.id);
      if (error) throw error;
      toast.success("Tarefa adiada");
      setOpen(false);
      setReason("");
      setDate("");
      qc.invalidateQueries({ queryKey: ["coordinator_tasks"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao adiar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1 h-8">
          <CalendarClock className="w-3.5 h-3.5" /> Adiar
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-2" align="end">
        <p className="text-sm font-medium">Adiar tarefa</p>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Nova data</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Motivo</label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explique o motivo do adiamento"
            rows={3}
          />
        </div>
        <Button size="sm" onClick={save} className="w-full" disabled={saving || !date || !reason.trim()}>
          {saving ? "Salvando..." : "Confirmar adiamento"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}