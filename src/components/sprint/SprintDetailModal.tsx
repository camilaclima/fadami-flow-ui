import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { SPRINT_STATUS_LABELS } from "@/types/sprint";
import type { Sprint, SprintStatus } from "@/types/sprint";
import { SprintPrePlanning } from "./SprintPrePlanning";
import { SprintPlanning } from "./SprintPlanning";
import { SprintExecution } from "./SprintExecution";
import { SprintClosing } from "./SprintClosing";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sprint: Sprint;
}

export function SprintDetailModal({ open, onOpenChange, sprint }: Props) {
  const status = sprint.status as SprintStatus;
  const defaultTab = status === "planned" ? "preplanning" : status === "active" ? "execution" : "closing";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-xl">{sprint.name}</DialogTitle>
            <Badge variant="outline" className="text-xs">
              {SPRINT_STATUS_LABELS[status] ?? status}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="mt-2">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="preplanning">Pré-Planning</TabsTrigger>
            <TabsTrigger value="planning">Planning</TabsTrigger>
            {(status === "active" || status === "finished") && (
              <TabsTrigger value="execution">Execução</TabsTrigger>
            )}
            {status === "finished" && (
              <TabsTrigger value="closing">Encerramento</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="preplanning" className="mt-4">
            <SprintPrePlanning sprint={sprint} />
          </TabsContent>
          <TabsContent value="planning" className="mt-4">
            <SprintPlanning sprint={sprint} />
          </TabsContent>
          {(status === "active" || status === "finished") && (
            <TabsContent value="execution" className="mt-4">
              <SprintExecution sprint={sprint} />
            </TabsContent>
          )}
          {status === "finished" && (
            <TabsContent value="closing" className="mt-4">
              <SprintClosing sprint={sprint} />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
