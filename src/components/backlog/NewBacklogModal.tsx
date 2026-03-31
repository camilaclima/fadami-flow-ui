import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBacklogStore } from "@/store/backlogStore";
import type { Thermometer, BacklogType } from "@/types/backlog";
import { BACKLOG_TYPE_LABELS } from "@/types/backlog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  TrendingUp,
  Snowflake,
  Paperclip,
  CloudUpload,
  X,
  FileText,
  ImageIcon,
  File,
  Sparkles,
  ChevronDown,
  Check,
  Code2,
  Layers,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return ImageIcon;
  if (type.includes("pdf") || type.includes("document")) return FileText;
  return File;
}

export function NewBacklogModal({ open, onOpenChange }: Props) {
  const { products, clients, addBacklog } = useBacklogStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [productId, setProductId] = useState("");
  const [clientId, setClientId] = useState("");
  const [thermometer, setThermometer] = useState<Thermometer | null>(null);
  const [backlogType, setBacklogType] = useState<BacklogType>("functional");
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const thermoOptions: { value: Thermometer; label: string; icon: typeof Flame; color: string; glowColor: string }[] = [
    { value: "low", label: "Baixo", icon: Snowflake, color: "hsl(var(--thermo-low))", glowColor: "hsl(var(--thermo-low) / 0.3)" },
    { value: "medium", label: "Médio", icon: TrendingUp, color: "hsl(var(--thermo-medium))", glowColor: "hsl(var(--thermo-medium) / 0.3)" },
    { value: "high", label: "Alto", icon: Flame, color: "hsl(var(--thermo-high))", glowColor: "hsl(var(--thermo-high) / 0.3)" },
  ];

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const added: AttachedFile[] = Array.from(newFiles).map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: f.name,
      size: f.size,
      type: f.type,
    }));
    setFiles((prev) => [...prev, ...added]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const handleSubmit = async () => {
    if (!title.trim() || !productId || !thermometer) {
      toast.error("Preencha o título, selecione um produto e o termômetro.");
      return;
    }
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    addBacklog({
      title: title.trim(),
      description: description.trim(),
      productId,
      clientId: clientId || undefined,
      thermometer,
      createdBy: "Você",
    });
    toast.success("Backlog criado com sucesso!");
    setTitle("");
    setDescription("");
    setProductId("");
    setClientId("");
    setThermometer(null);
    setFiles([]);
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const selectedProduct = products.find((p) => p.id === productId);
  const selectedClient = clients.find((c) => c.id === clientId);

  // Determine glow color based on thermometer selection
  const activeThermo = thermoOptions.find((t) => t.value === thermometer);
  const modalGlow = activeThermo
    ? `0 0 40px -8px ${activeThermo.glowColor}, var(--shadow-elevated)`
    : "0 0 30px -8px hsl(var(--primary) / 0.2), var(--shadow-elevated)";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[540px] p-0 gap-0 overflow-hidden bg-card border-border/60"
        style={{ boxShadow: modalGlow, transition: "box-shadow 0.4s ease" }}
      >
        {/* Header — compact */}
        <div className="px-5 pt-5 pb-3">
          <DialogHeader>
            <DialogTitle className="text-base font-bold tracking-tight flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
              Novo Backlog
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-5 pb-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do backlog..."
              className="w-full px-3 py-2 rounded-lg bg-secondary text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-shadow border-0"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Descreva o objetivo deste backlog..."
              className="w-full px-3 py-2 rounded-lg bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-shadow resize-none border-0"
            />
          </div>

          {/* Product & Client — side by side */}
          <div className="grid grid-cols-2 gap-3">
            {/* Product */}
            <div className="space-y-1 relative">
              <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">
                Produto <span className="text-primary">*</span>
              </label>
              <button
                onClick={() => { setProductOpen(!productOpen); setClientOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-secondary text-sm text-foreground hover:bg-surface-hover transition-colors"
              >
                <span className={selectedProduct ? "text-foreground" : "text-muted-foreground"}>
                  {selectedProduct ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedProduct.color }} />
                      {selectedProduct.name}
                    </span>
                  ) : "Selecione..."}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${productOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {productOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-50 top-full mt-1 w-full rounded-lg bg-card border border-border shadow-[var(--shadow-elevated)] overflow-hidden"
                  >
                    {products.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setProductId(p.id); setProductOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                      >
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}
                        {productId === p.id && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Client */}
            <div className="space-y-1 relative">
              <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">Cliente</label>
              <button
                onClick={() => { setClientOpen(!clientOpen); setProductOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-secondary text-sm text-foreground hover:bg-surface-hover transition-colors"
              >
                <span className={selectedClient ? "text-foreground" : "text-muted-foreground"}>
                  {selectedClient?.name || "Opcional"}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${clientOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {clientOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-50 top-full mt-1 w-full rounded-lg bg-card border border-border shadow-[var(--shadow-elevated)] overflow-hidden"
                  >
                    <button
                      onClick={() => { setClientId(""); setClientOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-secondary transition-colors"
                    >
                      Nenhum
                      {!clientId && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                    </button>
                    {clients.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setClientId(c.id); setClientOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                      >
                        <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-primary">{c.name[0]}</span>
                        </div>
                        {c.name}
                        {clientId === c.id && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Thermometer — no pre-selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">
              Termômetro de Impacto
            </label>
            <div className="flex gap-2">
              {thermoOptions.map((opt) => {
                const isActive = thermometer === opt.value;
                const Icon = opt.icon;
                return (
                  <motion.button
                    key={opt.value}
                    onClick={() => setThermometer(opt.value)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 relative overflow-hidden rounded-xl transition-all duration-300"
                    style={{
                      border: `1.5px solid ${isActive ? opt.color : "hsl(var(--border))"}`,
                      backgroundColor: isActive ? `${opt.glowColor.replace("0.3", "0.1")}` : "hsl(var(--secondary))",
                      boxShadow: isActive ? `0 0 16px -4px ${opt.glowColor}` : "none",
                    }}
                  >
                    <div className="flex flex-col items-center gap-1 py-2.5 px-2">
                      <motion.div
                        animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                      >
                        <Icon
                          className="w-4.5 h-4.5 transition-colors duration-300"
                          style={{ color: isActive ? opt.color : "hsl(var(--foreground) / 0.45)" }}
                          strokeWidth={isActive ? 2.5 : 2}
                        />
                      </motion.div>
                      <span
                        className="text-[11px] font-semibold transition-colors duration-300"
                        style={{ color: isActive ? opt.color : "hsl(var(--foreground) / 0.5)" }}
                      >
                        {opt.label}
                      </span>
                    </div>
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ backgroundColor: opt.color }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: isActive ? 1 : 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Attachments — compact */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              Anexos
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-lg border border-dashed transition-all duration-300 ${
                isDragging
                  ? "border-primary bg-primary/5 shadow-[var(--shadow-glow)]"
                  : "border-border hover:border-primary/40 hover:bg-secondary/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <div className="flex items-center justify-center gap-2 py-2.5">
                <motion.div
                  animate={isDragging ? { scale: 1.1, y: -1 } : { scale: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CloudUpload
                    className={`w-4 h-4 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground"}`}
                  />
                </motion.div>
                <p className="text-xs text-muted-foreground">
                  Solte arquivos aqui ou <span className="text-primary font-medium">clique para explorar</span>
                </p>
              </div>
            </div>

            <AnimatePresence>
              {files.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-1.5"
                >
                  {files.map((file) => {
                    const FileIcon = getFileIcon(file.type);
                    return (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary border border-border text-xs"
                      >
                        <FileIcon className="w-3 h-3 text-foreground/60" />
                        <span className="text-foreground font-medium max-w-[100px] truncate">{file.name}</span>
                        <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                          className="ml-0.5 p-0.5 rounded hover:bg-destructive/10 transition-colors"
                        >
                          <X className="w-2.5 h-2.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Submit */}
          <motion.button
            onClick={handleSubmit}
            disabled={isSubmitting}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-2.5 rounded-xl font-semibold text-sm text-primary-foreground bg-gradient-to-r from-primary to-[hsl(262_83%_58%)] hover:opacity-95 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 shadow-[var(--shadow-glow)]"
          >
            <AnimatePresence mode="wait">
              {isSubmitting ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"
                />
              ) : (
                <motion.span
                  key="text"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Criar Backlog
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
