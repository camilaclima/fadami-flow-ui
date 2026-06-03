import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { SPRINT_STATUS_LABELS } from "@/types/sprint";
import type { Sprint, SprintStatus } from "@/types/sprint";
import { SprintPrePlanning } from "./SprintPrePlanning";
import { SprintPlanning } from "./SprintPlanning";
import { SprintExecution } from "./SprintExecution";
import { SprintClosing } from "./SprintClosing";
import { SprintScopeAnalysis } from "./SprintScopeAnalysis";
import { useState, useEffect } from "react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sprint: Sprint;
}

function getDefaultTab(status: SprintStatus): string {
  if (status === "active") return "execution";
  if (status === "finished") return "closing";
  return "preplanning";
}

export function SprintDetailModal({ open, onOpenChange, sprint }: Props) {
  const status = sprint.status as SprintStatus;
  const [activeTab, setActiveTab] = useState(getDefaultTab(status));

  useEffect(() => {
    setActiveTab(getDefaultTab(status));
  }, [status]);

  const handleAdvanceToPlanning = () => setActiveTab("planning");
  const handleAdvanceToExecution = () => setActiveTab("execution");

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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="preplanning">Pré-Planning</TabsTrigger>
            <TabsTrigger value="planning">Planning</TabsTrigger>
            {(status === "active" || status === "finished") && (
              <TabsTrigger value="execution">Execução</TabsTrigger>
            )}
            {(status === "active" || status === "finished") && (
              <TabsTrigger value="scope">Escopo</TabsTrigger>
            )}
            {status === "finished" && (
              <TabsTrigger value="closing">Encerramento</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="preplanning" className="mt-4">
            <SprintPrePlanning sprint={sprint} onAdvance={handleAdvanceToPlanning} />
          </TabsContent>
          <TabsContent value="planning" className="mt-4">
            <SprintPlanning sprint={sprint} onAdvance={handleAdvanceToExecution} />
          </TabsContent>
          {(status === "active" || status === "finished") && (
            <TabsContent value="execution" className="mt-4">
              <SprintExecution sprint={sprint} />
            </TabsContent>
          )}
          {(status === "active" || status === "finished") && (
            <TabsContent value="scope" className="mt-4">
              <SprintScopeAnalysis sprint={sprint} />
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
