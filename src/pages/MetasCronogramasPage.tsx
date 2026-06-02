import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitBranch, ListChecks, Map, CalendarRange } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useAuthorizedProducts } from "@/hooks/useAuthorizedProducts";
import { SprintsTab } from "./metas/SprintsTab";
import { AtividadesTab } from "./metas/AtividadesTab";
import { RoadmapTab } from "./metas/RoadmapTab";
import { CronogramaTab } from "./metas/CronogramaTab";

const ALL = "__all__";

export default function MetasCronogramasPage() {
  const { productIds } = useAuthorizedProducts();
  const { data: products = [] } = useProducts();
  const [productFilter, setProductFilter] = useState<string>(ALL);

  const visibleProducts = useMemo(
    () => (productIds ? products.filter((p) => productIds.includes(p.id)) : products),
    [products, productIds]
  );

  const selectedProductId = productFilter === ALL ? null : productFilter;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Metas e Cronogramas</h2>
        <Select value={productFilter} onValueChange={setProductFilter}>
          <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os Projetos</SelectItem>
            {visibleProducts.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="sprints" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="sprints" className="gap-2"><GitBranch className="w-4 h-4" /> Sprints</TabsTrigger>
          <TabsTrigger value="atividades" className="gap-2"><ListChecks className="w-4 h-4" /> Atividades</TabsTrigger>
          <TabsTrigger value="roadmap" className="gap-2"><Map className="w-4 h-4" /> Roadmap</TabsTrigger>
          <TabsTrigger value="cronograma" className="gap-2"><CalendarRange className="w-4 h-4" /> Cronograma</TabsTrigger>
        </TabsList>

        <TabsContent value="sprints" className="mt-4">
          <SprintsTab productIds={productIds} selectedProductId={selectedProductId} />
        </TabsContent>
        <TabsContent value="atividades" className="mt-4">
          <AtividadesTab productIds={productIds} selectedProductId={selectedProductId} />
        </TabsContent>
        <TabsContent value="roadmap" className="mt-4">
          <RoadmapTab productIds={productIds} selectedProductId={selectedProductId} />
        </TabsContent>
        <TabsContent value="cronograma" className="mt-4">
          <CronogramaTab productIds={productIds} selectedProductId={selectedProductId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}