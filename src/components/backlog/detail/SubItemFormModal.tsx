import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SubItem } from "@/types/backlog";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, CloudUpload, Paperclip, X, FileText } from "lucide-react";
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
        // Assume que múltiplos anexos podem vir separados por vírgula no banco
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
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden bg-card border-border/60">
        <div className="px-5 pt-5 pb-3">
          <DialogHeader>
            <DialogTitle className="text-base font-bold tracking-tight">
              {editItem ? "Editar Subitem" : "Novo Subitem"}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-5 pb-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">
              Título <span className="text-primary">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do subitem..."
              className="w-full px-3 py-2 rounded-lg bg-secondary text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-shadow border-0"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">
              Detalhamento Funcional
            </label>
            <textarea
              value={functionalDetail}
              onChange={(e) => setFunctionalDetail(e.target.value)}
              rows={2}
              placeholder="Descreva o detalhamento funcional..."
              className="w-full px-3 py-2 rounded-lg bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-shadow resize-none border-0"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">
              Detalhamento Técnico
            </label>
            <textarea
              value={technicalDetail}
              onChange={(e) => setTechnicalDetail(e.target.value)}
              rows={2}
              placeholder="Descreva o detalhamento técnico..."
              className="w-full px-3 py-2 rounded-lg bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-shadow resize-none border-0"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">
              Estimativa (Horas) <span className="text-primary">*</span>
            </label>
            <input
              type="number"
              min={0}
              value={estimate || ""}
              onChange={(e) => setEstimate(Number(e.target.value))}
              placeholder="Ex: 8"
              className="w-full px-3 py-2 rounded-lg bg-secondary text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-shadow border-0"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              Anexar Documentos
            </label>

            <div className="space-y-2">
              <AnimatePresence>
                {attachments.map((file) => (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    key={file.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                    {file.url ? (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate flex-1"
                      >
                        {file.name}
                      </a>
                    ) : (
                      <span className="text-foreground truncate flex-1">{file.name}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(file.id)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`relative cursor-pointer rounded-lg border border-dashed transition-all duration-300 ${
                  isDragging
                    ? "border-primary bg-primary/5"
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
                <div className="flex items-center justify-center gap-2 py-3">
                  <CloudUpload className={`w-4 h-4 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-[11px] text-muted-foreground">
                    Solte ou <span className="text-primary font-medium">clique</span> para anexar vários arquivos
                  </p>
                </div>
              </div>
            </div>
          </div>

          <motion.button
            type="button"
            onClick={handleSave}
            disabled={saving}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full mt-4 py-2.5 rounded-xl font-semibold text-sm text-primary-foreground bg-gradient-to-r from-primary to-[hsl(262_83%_58%)] hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> {editItem ? "Salvar Alterações" : "Adicionar Subitem"}
              </>
            )}
          </motion.button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
