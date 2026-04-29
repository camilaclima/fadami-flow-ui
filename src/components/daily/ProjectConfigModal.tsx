import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FileText, Sparkles, Loader2, Save, BookOpen, ListChecks,
  Trash2, Paperclip, ExternalLink, AlertCircle, CheckCircle2, XCircle, Settings,
} from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { uploadAttachment } from "@/lib/uploadAttachment";
import { cn } from "@/lib/utils";

interface BacklogItem {
  id: string;
  product_id: string;
  project_context_id: string;
  task: string;
  likely_owner: string;
  deadline: string;
  risk_mitigation: string;
  category: string;
  sort_order: number;
  approved: boolean;
}

interface ProjectContext {
  id: string;
  product_id: string;
  documentation: string;
  attachment_url: string | null;
  ai_summary: string;
  updated_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
}

/** Try to read the attachment as plain text (works for .txt, .md, .json, .csv). */
async function readAttachmentText(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return "";
    const ct = res.headers.get("content-type") ?? "";
    if (ct.startsWith("text/") || ct.includes("json") || ct.includes("xml") || ct.includes("csv")) {
      const txt = await res.text();
      // Heuristic: ignore obviously binary content
      if (txt && txt.length > 10 && !/[\u0000-\u0008\u000E-\u001F]/.test(txt.slice(0, 200))) {
        return txt;
      }
    }
    return "";
  } catch {
    return "";
  }
}

export function ProjectConfigModal({ open, onOpenChange, productId, productName }: Props) {
  const qc = useQueryClient();
  const [documentation, setDocumentation] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [savingApproval, setSavingApproval] = useState(false);

  const { data: context, isFetching: loadingContext } = useQuery({
    queryKey: ["project_context", productId],
    enabled: !!productId && open,
    queryFn: async () => {
      const { data, error } = await (supabase.from("project_contexts") as any)
        .select("*").eq("product_id", productId).maybeSingle();
      if (error) throw error;
      return data as ProjectContext | null;
    },
  });

  const { data: backlogItems = [] } = useQuery({
    queryKey: ["project_backlog_all", productId],
    enabled: !!productId && open,
    queryFn: async () => {
      const { data, error } = await (supabase.from("project_backlog_items") as any)
        .select("*").eq("product_id", productId).order("sort_order", { ascending: true });
      if (error) throw error;
      return data as BacklogItem[];
    },
  });

  // Local approval state (mirrors DB; user can toggle then "Save approvals")
  const [approvalMap, setApprovalMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      setDocumentation(context?.documentation ?? "");
      setAttachmentUrl(context?.attachment_url ?? null);
    }
  }, [open, context]);

  useEffect(() => {
    setApprovalMap(Object.fromEntries(backlogItems.map((b) => [b.id, !!b.approved])));
  }, [backlogItems]);

  const dirtyApprovals = useMemo(
    () => backlogItems.some((b) => !!b.approved !== !!approvalMap[b.id]),
    [backlogItems, approvalMap],
  );

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadAttachment(file, `project-contexts/${productId}`);
      setAttachmentUrl(url);
      toast.success("Arquivo anexado.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveAndAnalyze = async () => {
    const hasDoc = documentation.trim().length >= 20;
    const hasAttachment = !!attachmentUrl;
    if (!hasDoc && !hasAttachment) {
      return toast.error("Preencha a documentação ou anexe um arquivo (ao menos um é obrigatório).");
    }

    setAnalyzing(true);
    try {
      let attachmentText = "";
      if (!hasDoc && hasAttachment && attachmentUrl) {
        attachmentText = await readAttachmentText(attachmentUrl);
        if (!attachmentText) {
          throw new Error("Não foi possível extrair texto do anexo automaticamente. Cole a documentação ou envie um arquivo de texto (.txt, .md, .json, .csv).");
        }
      }

      const { data: aiData, error: aiError } = await supabase.functions.invoke("extract-project-backlog", {
        body: {
          documentation: documentation.trim(),
          attachmentText,
          attachmentUrl,
          productName,
        },
      });
      if (aiError) throw aiError;
      const result = aiData?.result as { summary: string; items: any[] };
      if (!result?.items?.length) throw new Error("IA não retornou itens. Tente refinar a documentação.");

      let contextId = context?.id;
      if (contextId) {
        const { error: upErr } = await (supabase.from("project_contexts") as any).update({
          documentation,
          attachment_url: attachmentUrl,
          ai_summary: result.summary,
        }).eq("id", contextId);
        if (upErr) throw upErr;
      } else {
        const { data: ins, error: insErr } = await (supabase.from("project_contexts") as any).insert({
          product_id: productId,
          documentation,
          attachment_url: attachmentUrl,
          ai_summary: result.summary,
        }).select().single();
        if (insErr) throw insErr;
        contextId = ins.id;
      }

      // Replace ONLY the not-yet-approved items (preserve approved history); simpler: replace all draft items, keep approved ones
      await (supabase.from("project_backlog_items") as any).delete().eq("product_id", productId).eq("approved", false);
      const rows = result.items.map((it: any, idx: number) => ({
        project_context_id: contextId,
        product_id: productId,
        task: it.task,
        likely_owner: it.likely_owner ?? "",
        deadline: it.deadline ?? "",
        risk_mitigation: it.risk_mitigation ?? "",
        category: it.category ?? "",
        sort_order: idx,
        approved: false,
      }));
      const { error: bErr } = await (supabase.from("project_backlog_items") as any).insert(rows);
      if (bErr) throw bErr;

      qc.invalidateQueries({ queryKey: ["project_context", productId] });
      qc.invalidateQueries({ queryKey: ["project_backlog_all", productId] });
      qc.invalidateQueries({ queryKey: ["project_backlog", productId] });
      toast.success(`${result.items.length} item(ns) sugeridos. Aprove os que devem entrar no Contexto Mestre.`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Erro ao gerar backlog");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveApprovals = async () => {
    setSavingApproval(true);
    try {
      const changes = backlogItems.filter((b) => !!b.approved !== !!approvalMap[b.id]);
      for (const c of changes) {
        const { error } = await (supabase.from("project_backlog_items") as any)
          .update({ approved: approvalMap[c.id] }).eq("id", c.id);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["project_backlog_all", productId] });
      qc.invalidateQueries({ queryKey: ["project_backlog", productId] });
      toast.success("Aprovações salvas.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar aprovações");
    } finally {
      setSavingApproval(false);
    }
  };

  const handleApproveAll = () => {
    setApprovalMap(Object.fromEntries(backlogItems.map((b) => [b.id, true])));
  };
  const handleRejectAll = () => {
    setApprovalMap(Object.fromEntries(backlogItems.map((b) => [b.id, false])));
  };

  const handleDeleteItem = async (id: string) => {
    const { error } = await (supabase.from("project_backlog_items") as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["project_backlog_all", productId] });
    qc.invalidateQueries({ queryKey: ["project_backlog", productId] });
  };

  const approvedCount = backlogItems.filter((b) => b.approved).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" /> Configuração do Projeto · {productName}
          </DialogTitle>
          <DialogDescription>
            Documentação, Contexto Mestre e Backlog Aprovado usados pela IA nas dailys.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3 -mr-3">
          <div className="space-y-5 pb-2">
            {/* Documentação */}
            <section className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Documentação do Projeto</h3>
              </div>
              <p className="text-xs text-muted-foreground -mt-1">
                Forneça <span className="font-medium">documentação em texto</span> OU <span className="font-medium">anexo</span> (ao menos um é obrigatório).
              </p>

              <div className="space-y-2">
                <Label className="text-xs">Documentação (texto · opcional)</Label>
                <Textarea
                  value={documentation}
                  onChange={(e) => setDocumentation(e.target.value)}
                  rows={8}
                  placeholder="Cole aqui escopo, requisitos, briefings, atas, especificações..."
                  disabled={loadingContext}
                  className="resize-y"
                />
                <p className="text-[11px] text-muted-foreground">{documentation.length} caracteres</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Anexo (opcional)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                      e.target.value = "";
                    }}
                  />
                  {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                {attachmentUrl && (
                  <a href={attachmentUrl} target="_blank" rel="noreferrer"
                     className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                    <Paperclip className="h-3 w-3" /> Arquivo anexado <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {context?.ai_summary && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide">Resumo do Contexto Mestre (IA)</p>
                  <p className="text-sm text-muted-foreground italic">{context.ai_summary}</p>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> Gerar substitui apenas os itens ainda não aprovados.
                </p>
                <Button onClick={handleSaveAndAnalyze} disabled={analyzing} size="sm">
                  {analyzing
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processando IA...</>
                    : <><Sparkles className="h-4 w-4 mr-2" /> Salvar e gerar backlog</>}
                </Button>
              </div>
            </section>

            {/* Backlog */}
            <section className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Backlog Sugerido pela IA</h3>
                  <Badge variant="secondary" className="text-[10px]">{approvedCount}/{backlogItems.length} aprovados</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={handleApproveAll} disabled={!backlogItems.length}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprovar todos
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleRejectAll} disabled={!backlogItems.length}>
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeitar todos
                  </Button>
                  <Button size="sm" onClick={handleSaveApprovals} disabled={!dirtyApprovals || savingApproval}>
                    {savingApproval ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                    Salvar aprovações
                  </Button>
                </div>
              </div>

              {backlogItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Nenhum item ainda. Preencha a documentação ou anexo e gere o backlog.
                </p>
              ) : (
                <ul className="space-y-2">
                  {backlogItems.map((it) => {
                    const checked = !!approvalMap[it.id];
                    return (
                      <li
                        key={it.id}
                        className={cn(
                          "rounded-lg border p-3 transition-all",
                          checked
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : "border-border/60 bg-background/40"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => setApprovalMap((p) => ({ ...p, [it.id]: !!v }))}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="text-sm font-medium">{it.task}</p>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {it.category && <Badge variant="outline" className="text-[10px]">{it.category}</Badge>}
                                {it.approved && <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Aprovado</Badge>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <span><strong>Resp:</strong> {it.likely_owner || "—"}</span>
                              <span><strong>Prazo:</strong> {it.deadline || "—"}</span>
                            </div>
                            {it.risk_mitigation && (
                              <p className="text-[11px] text-muted-foreground italic">⚠ {it.risk_mitigation}</p>
                            )}
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteItem(it.id)} className="h-7 w-7 flex-shrink-0">
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}