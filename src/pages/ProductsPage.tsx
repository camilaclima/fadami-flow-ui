import { useState } from "react";
import { useProducts, useAddProduct, useUpdateProduct, useToggleProductStatus, type Product } from "@/hooks/useProducts";
import { ProductFormModal } from "@/components/admin/ProductFormModal";
import { Package, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";

export default function ProductsPage() {
  const { data: products = [] } = useProducts();
  const addProduct = useAddProduct();
  const updateProduct = useUpdateProduct();
  const toggleStatus = useToggleProductStatus();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const handleNew = () => { setEditing(null); setModalOpen(true); };
  const handleEdit = (p: Product) => { setEditing(p); setModalOpen(true); };

  const handleSave = (data: { name: string; description: string; color: string }) => {
    if (editing) {
      updateProduct.mutate({ id: editing.id, ...data });
    } else {
      addProduct.mutate(data);
    }
  };

  const handleToggle = (p: Product) => {
    toggleStatus.mutate({ id: p.id, currentStatus: p.status });
  };

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os produtos do seu portfólio</p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Produto
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${p.color}20` }}>
                      <Package className="w-4 h-4" style={{ color: p.color }} />
                    </div>
                    <span className="font-medium text-foreground">{p.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{p.description}</TableCell>
                <TableCell>
                  <Badge variant={p.status === "active" ? "default" : "secondary"} className={p.status === "active" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}>
                    {p.status === "active" ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(p)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleToggle(p)}>
                    {p.status === "active" ? "Inativar" : "Ativar"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>

      <ProductFormModal open={modalOpen} onOpenChange={setModalOpen} product={editing} onSave={handleSave} />
    </div>
  );
}
