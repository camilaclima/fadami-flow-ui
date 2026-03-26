import { useBacklogStore } from "@/store/backlogStore";
import { Package } from "lucide-react";
import { motion } from "framer-motion";

export default function ProductsPage() {
  const products = useBacklogStore((s) => s.products);
  const backlogs = useBacklogStore((s) => s.backlogs);

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie os produtos do seu portfólio</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product, i) => {
          const count = backlogs.filter((b) => b.productId === product.id).length;
          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-2xl p-5 hover-lift"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{product.name}</h3>
                  <p className="text-xs text-muted-foreground">{count} backlogs</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
