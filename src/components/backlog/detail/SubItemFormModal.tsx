import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SubItem } from "@/types/backlog";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, CloudUpload, Paperclip, X, FileText, Layout, Code } from "lucide-react";
import { toast } from "sonner";
import { uploadAttachment } from "@/lib/uploadAttachment";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (data: Omit<SubItem, "id" | "order">) => void;
  editItem?: SubItem | null;
}

interface AttachmentItem {
  id: string;
  name: string;
  url?: string;
  file?: File;
}

export function SubItemFormModal({ open, onOpenChange, onSave, editItem }: Props) {
  const [title, setTitle] = useState("");
  const [functionalDetail, setFunctionalDetail] = useState("");
  const [technicalDetail, setTechnicalDetail] = useState("");
  const [estimate, setEstimate] = useState<number>(0);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editItem) {
      setTitle(editItem.title);
      setFunctionalDetail(editItem.functionalDetail);
      setTechnicalDetail(editItem.technicalDetail);
      setEstimate(editItem.estimate);

      if (editItem.attachment) {
        const urls = editItem.attachment.split(",");
        setAttachments(
          urls.map((url) => ({
            id: Math.random().toString(36).substr(2, 9),
            name: url.split("/").pop() || "Arquivo",
            url: url.trim(),
          })),
        );
      } else {
        setAttachments([]);
      }
    } else {
      setTitle("");
      setFunctionalDetail("");
      setTechnicalDetail("");
      setEstimate(0);
      setAttachments([]);
    }
  }, [editItem, open]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles: AttachmentItem[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      file: file,
    }));

    setAttachments((prev) => [...prev, ...newFiles]);
  }, []);

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Informe o título do subitem.");
      return;
    }
    if (estimate <= 0) {
      toast.error("Informe a estimativa em horas.");
      return;
    }

    setSaving(true);
    try {
      const uploadPromises = attachments.map(async (attr) => {
        if (attr.file) {
          return await uploadAttachment(attr.file, "subitems");
        }
        return attr.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const finalAttachmentString = uploadedUrls.filter(Boolean).join(",");

      onSave({
        title: title.trim(),
        functionalDetail,
        technicalDetail,
        estimate,
        attachment: finalAttachmentString || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Erro ao enviar anexos.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-0 gap-0 overflow-hidden bg-card border-border/60 shadow-2xl">
        <div className="px-8 pt-8 pb-4 border-b border-border/40 bg-secondary/20">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Layout className="w-4 h-4 text-primary" />
              </div>
              {editItem ? "Editar Subitem" : "Novo Subitem"}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-8 py-6 space-y-7 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Título Principal */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground/80 uppercase tracking-widest">
              Título do Subitem <span className="text-primary">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Criar endpoint de autenticação..."
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/40 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all outline-none"
            />
          </div>

          {/* Seção Funcional */}
          <div className="space-y-3 p-5 rounded-2xl bg-secondary/30 border border-border/40">
            <div className="flex items-center gap-2 text-primary">
              <Layout className="w-4 h-4" />
              <label className="text-xs font-bold uppercase tracking-widest">Detalhamento Funcional</label>
            </div>
            <textarea
              value={functionalDetail}
              onChange={(e) => setFunctionalDetail(e.target.value)}
              rows={4}
              placeholder="O que o usuário espera desta funcionalidade?"
              className="w-full px-4 py-3 rounded-xl bg-card border border-border/40 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none"
            />
          </div>

          {/* Seção Técnica */}
          <div className="space-y-3 p-5 rounded-2xl bg-secondary/30 border border-border/40">
            <div className="flex items-center gap-2 text-primary">
              <Code className="w-4 h-4" />
              <label className="text-xs font-bold uppercase tracking-widest">Detalhamento Técnico</label>
            </div>
            <textarea
              value={technicalDetail}
              onChange={(e) => setTechnicalDetail(e.target.value)}
              rows={4}
              placeholder="Especificações de banco, API, componentes..."
              className="w-full px-4 py-3 rounded-xl bg-card border border-border/40 text-sm font-mono focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Estimativa */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/80 uppercase tracking-widest">
                Estimativa <span className="text-primary">(Horas)</span>
              </label>
              <input
                type="number"
                min={0}
                value={estimate || ""}
                onChange={(e) => setEstimate(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/40 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            {/* Anexos */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/80 uppercase tracking-widest flex items-center gap-1">
                <Paperclip className="w-3 h-3" /> Anexos
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="group flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <CloudUpload className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs text-muted-foreground group-hover:text-primary font-medium transition-colors">
                  Adicionar arquivos
                </span>
              </div>
            </div>
          </div>

          {/* Lista de Anexos */}
          <AnimatePresence>
            {attachments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attachments.map((file) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={file.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 border border-border/40 text-xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate flex-1 font-medium">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(file.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-8 py-6 bg-secondary/20 border-t border-border/40">
          <motion.button
            type="button"
            onClick={handleSave}
            disabled={saving}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full py-4 rounded-2xl font-bold text-sm text-primary-foreground bg-primary hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Processando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" /> {editItem ? "Atualizar Subitem" : "Confirmar e Adicionar"}
              </>
            )}
          </motion.button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
