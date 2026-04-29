import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  FileText, Sparkles, Loader2, Upload, Save, BookOpen, ListChecks,
  Trash2, Paperclip, ExternalLink, AlertCircle,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useActiveProducts } from "@/hooks/useProducts";
import { uploadAttachment } from "@/lib/uploadAttachment";

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
}

interface ProjectContext {
  id: string;
  product_id: string;
  documentation: string;
  attachment_url: string | null;
  ai_summary: string;
  updated_at: string;
}

export default function ProjectContextPage() {
  const qc = useQueryClient();
  const { data: products = [] } = useActiveProducts();
  const [productId, setProductId] = useState<string>("");
  const [documentation, setDocumentation] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const { data: context, isFetching: loadingContext } = useQuery({
    queryKey: ["project_context", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("project_contexts") as any)
        .select("*").eq("product_id", productId).maybeSingle();
      if (error) throw error;
      return data as ProjectContext | null;
    },
  });

  const { data: backlogItems = [] } = useQuery({
    queryKey: ["project_backlog", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("project_backlog_items") as any)
        .select("*").eq("product_id", productId).order("sort_order", { ascending: true });
      if (error) throw error;
      return data as BacklogItem[];
    },
  });

  useEffect(() => {
    if (context) {
      setDocumentation(context.documentation ?? "");
      setAttachmentUrl(context.attachment_url ?? null);
    } else {
      setDocumentation("");
      setAttachmentUrl(null);
    }
  }, [context, productId]);

  const product = useMemo(() => products.find((p) => p.id === productId), [products, productId]);

  const handleUpload = async (file: File) => {
    if (!productId) {
      toast.error("Selecione um projeto antes de anexar o arquivo.");
      return;
    }
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
    if (!productId) return toast.error("Selecione um projeto.");
    if (!documentation.trim() || documentation.trim().length < 20) {
      return toast.error("Adicione ao menos 20 caracteres de documentação.");
    }
    setAnalyzing(true);
    try {
      // 1. Call AI to extract structured backlog
      const { data: aiData, error: aiError } = await supabase.functions.invoke("extract-project-backlog", {
        body: { documentation, productName: product?.name },
      });
      if (aiError) throw aiError;
      const result = aiData?.result as { summary: string; items: Omit<BacklogItem, "id" | "product_id" | "project_context_id" | "sort_order">[] };
      if (!result?.items?.length) throw new Error("IA não retornou itens. Tente refinar a documentação.");

      // 2. Upsert project_contexts
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

      // 3. Replace backlog items
      await (supabase.from("project_backlog_items") as any).delete().eq("product_id", productId);
      const rows = result.items.map((it, idx) => ({
        project_context_id: contextId,
        product_id: productId,
        task: it.task,
        likely_owner: it.likely_owner ?? "",
        deadline: it.deadline ?? "",
        risk_mitigation: it.risk_mitigation ?? "",
        category: it.category ?? "",
        sort_order: idx,
      }));
      const { error: bErr } = await (supabase.from("project_backlog_items") as any).insert(rows);
      if (bErr) throw bErr;

      qc.invalidateQueries({ queryKey: ["project_context", productId] });
      qc.invalidateQueries({ queryKey: ["project_backlog", productId] });
      toast.success(`Contexto Mestre salvo. ${result.items.length} item(ns) gerados.`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Erro ao gerar backlog");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    const { error } = await (supabase.from("project_backlog_items") as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["project_backlog", productId] });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary"><BookOpen className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-bold">Configuração e Backlog</h1>
          <p className="text-sm text-muted-foreground">Documentação do projeto + Contexto Mestre alimentado por IA.</p>
        </div>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Documentação do Projeto</CardTitle>
          <CardDescription>Cole a documentação ou anexe o arquivo. A IA gerará o Backlog Sugerido e salvará como Contexto Mestre.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="Selecione um projeto" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Anexo (opcional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  disabled={!productId || uploading}
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
          </div>

          <div className="space-y-2">
            <Label>Documentação (texto)</Label>
            <Textarea
              value={documentation}
              onChange={(e) => setDocumentation(e.target.value)}
              rows={10}
              placeholder="Cole aqui escopo, requisitos, briefings, atas, especificações..."
              disabled={!productId || loadingContext}
              className="resize-y"
            />
            <p className="text-[11px] text-muted-foreground">
              {documentation.length} caracteres · A IA usará este texto como base do Contexto Mestre.
            </p>
          </div>

          {context?.ai_summary && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide">Resumo do Contexto Mestre (IA)</p>
              <p className="text-sm text-muted-foreground italic">{context.ai_summary}</p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" /> Salvar substitui o backlog atual e atualiza o Contexto Mestre usado nas dailys.
            </p>
            <Button onClick={handleSaveAndAnalyze} disabled={!productId || analyzing}>
              {analyzing
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processando IA...</>
                : <><Sparkles className="h-4 w-4 mr-2" /> Salvar e gerar backlog</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" /> Backlog Sugerido</CardTitle>
              <CardDescription>Gerado pela IA a partir da documentação.</CardDescription>
            </div>
            <Badge variant="secondary">{backlogItems.length} item(ns)</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!productId ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Selecione um projeto para ver o backlog.</p>
          ) : backlogItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum item ainda. Preencha a documentação e clique em "Salvar e gerar backlog".
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[28%]">Tarefa / Entrega</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead className="w-[28%]">Mitigação de Riscos</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backlogItems.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium align-top">{it.task}</TableCell>
                      <TableCell className="text-sm text-muted-foreground align-top">{it.likely_owner || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground align-top">{it.deadline || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground align-top">{it.risk_mitigation || "—"}</TableCell>
                      <TableCell className="align-top">
                        {it.category ? <Badge variant="outline" className="text-xs">{it.category}</Badge> : "—"}
                      </TableCell>
                      <TableCell className="align-top">
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteItem(it.id)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}