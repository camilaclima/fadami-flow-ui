import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { GitBranch, ListChecks, Map, CalendarRange, Plus } from "lucide-react";
import { useAuthorizedProducts } from "@/hooks/useAuthorizedProducts";
import { SprintsTab } from "./metas/SprintsTab";
import { AtividadesTab } from "./metas/AtividadesTab";
import { RoadmapTab } from "./metas/RoadmapTab";
import { CronogramaTab } from "./metas/CronogramaTab";

export default function MetasCronogramasPage() {
  const { productIds } = useAuthorizedProducts();
  const [tab, setTab] = useState("sprints");
  const [createSprintOpen, setCreateSprintOpen] = useState(false);
  const [createActivityOpen, setCreateActivityOpen] = useState(false);

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="sprints" className="gap-2"><GitBranch className="w-4 h-4" /> Sprints</TabsTrigger>
            <TabsTrigger value="atividades" className="gap-2"><ListChecks className="w-4 h-4" /> Atividades</TabsTrigger>
            <TabsTrigger value="roadmap" className="gap-2"><Map className="w-4 h-4" /> Roadmap</TabsTrigger>
            <TabsTrigger value="cronograma" className="gap-2"><CalendarRange className="w-4 h-4" /> Cronograma</TabsTrigger>
          </TabsList>
          {tab === "sprints" && (
            <Button onClick={() => setCreateSprintOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Criar Sprint
            </Button>
          )}
          {tab === "atividades" && (
            <Button onClick={() => setCreateActivityOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Criar Atividade
            </Button>
          )}
        </div>

        <TabsContent value="sprints" className="mt-4">
          <SprintsTab productIds={productIds} createOpen={createSprintOpen} onCreateOpenChange={setCreateSprintOpen} />
        </TabsContent>
        <TabsContent value="atividades" className="mt-4">
          <AtividadesTab productIds={productIds} createOpen={createActivityOpen} onCreateOpenChange={setCreateActivityOpen} />
        </TabsContent>
        <TabsContent value="roadmap" className="mt-4">
          <RoadmapTab productIds={productIds} />
        </TabsContent>
        <TabsContent value="cronograma" className="mt-4">
          <CronogramaTab productIds={productIds} />
        </TabsContent>
      </Tabs>
    </div>
  );
}