import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AIRecorrencia { descricao: string; dias_consecutivos: number; responsavel?: string; }
interface AIOcioso { nome: string; motivo: string; }
interface AISobrecarregado { nome: string; motivo: string; nivel_risco: string; }
interface AIDependencia { item: string; bloqueador: string; tipo: string; }
interface AIInsights {
  avancos?: string[];
  riscos?: string[];
  recorrencias?: AIRecorrencia[];
  resumo_executivo?: string;
  resumo_curto?: string;
  vibe_equipe?: string;
  proximos_passos?: string[];
  colaboradores_ociosos?: AIOcioso[];
  colaboradores_sobrecarregados?: AISobrecarregado[];
  dependencias_externas?: AIDependencia[];
  avancos_consolidados?: string[];
  prospeccao_riscos?: string[];
}

interface DailyExportData {
  productName: string;
  dailyNumber: number;
  statusDate: string;
  sprintLabel: string;
  blockerLevel: number;
  presentMembers: string[];
  rawSummary: string;
  insights: AIInsights | null;
}

/** Parse "=== Name ===\ntext" blocks from the composite summary. */
export function parseRawReport(summary: string): { name: string; text: string }[] {
  if (!summary) return [];
  const parts = summary.split(/\n?===\s+([^=]+?)\s+===\n/g).filter(Boolean);
  if (parts.length < 2) return [{ name: "Relato", text: summary.trim() }];
  const blocks: { name: string; text: string }[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const name = (parts[i] ?? "").trim();
    const text = (parts[i + 1] ?? "").trim();
    if (name || text) blocks.push({ name: name || "Relato", text });
  }
  return blocks;
}

export function downloadDailyReportPdf(d: DailyExportData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  let y = M;

  const ensureSpace = (h: number) => {
    if (y + h > H - M) { doc.addPage(); y = M; }
  };

  // Header
  doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text(`Daily #${d.dailyNumber} — ${d.productName}`, M, y); y += 22;

  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  doc.text(`Data: ${format(parseISO(d.statusDate), "dd/MM/yyyy", { locale: ptBR })}`, M, y); y += 14;
  doc.text(`Sprint: ${d.sprintLabel || "—"}`, M, y); y += 14;
  doc.text(`Bloqueio (IA): ${d.blockerLevel}/5`, M, y); y += 14;
  doc.text(`Membros presentes: ${d.presentMembers.join(", ") || "—"}`, M, y); y += 20;

  // ============= AI Section =============
  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text("Análise da IA", M, y); y += 8;
  doc.setLineWidth(0.5); doc.line(M, y, W - M, y); y += 12;

  const ins = d.insights;

  if (ins?.resumo_executivo) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text("Resumo Executivo", M, y); y += 14;
    doc.setFont("helvetica", "italic"); doc.setFontSize(10);
    const lines = doc.splitTextToSize(ins.resumo_executivo, W - M * 2);
    ensureSpace(lines.length * 12 + 10);
    doc.text(lines, M, y); y += lines.length * 12 + 8;
  }

  const bullets = (title: string, items?: string[]) => {
    if (!items?.length) return;
    ensureSpace(30);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text(title, M, y); y += 14;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    for (const it of items) {
      const lines = doc.splitTextToSize(`• ${it}`, W - M * 2);
      ensureSpace(lines.length * 12 + 4);
      doc.text(lines, M, y);
      y += lines.length * 12 + 2;
    }
    y += 6;
  };

  bullets("Avanços", ins?.avancos);
  bullets("Riscos", ins?.riscos);
  bullets("Avanços Consolidados", ins?.avancos_consolidados);
  bullets("Prospecção de Riscos", ins?.prospeccao_riscos);
  bullets("Próximos Passos", ins?.proximos_passos);

  if (ins?.recorrencias?.length) {
    ensureSpace(40);
    autoTable(doc, {
      startY: y,
      theme: "striped",
      head: [["Recorrência", "Dias", "Responsável"]],
      body: ins.recorrencias.map((r) => [r.descricao, `${r.dias_consecutivos}d`, r.responsavel ?? "—"]),
      headStyles: { fillColor: [220, 38, 38] },
      margin: { left: M, right: M },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  if (ins?.colaboradores_ociosos?.length) {
    ensureSpace(40);
    autoTable(doc, {
      startY: y,
      theme: "grid",
      head: [["Ocioso", "Motivo"]],
      body: ins.colaboradores_ociosos.map((o) => [o.nome, o.motivo]),
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: M, right: M },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  if (ins?.colaboradores_sobrecarregados?.length) {
    ensureSpace(40);
    autoTable(doc, {
      startY: y,
      theme: "grid",
      head: [["Sobrecarregado", "Motivo", "Risco"]],
      body: ins.colaboradores_sobrecarregados.map((s) => [s.nome, s.motivo, s.nivel_risco]),
      headStyles: { fillColor: [234, 88, 12] },
      margin: { left: M, right: M },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  if (ins?.dependencias_externas?.length) {
    ensureSpace(40);
    autoTable(doc, {
      startY: y,
      theme: "grid",
      head: [["Item", "Bloqueador", "Tipo"]],
      body: ins.dependencias_externas.map((x) => [x.item, x.bloqueador, x.tipo]),
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: M, right: M },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // ============= Raw Report Section =============
  doc.addPage(); y = M;
  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text("Relatório Bruto", M, y); y += 8;
  doc.setLineWidth(0.5); doc.line(M, y, W - M, y); y += 14;

  const blocks = parseRawReport(d.rawSummary);
  for (const b of blocks) {
    ensureSpace(30);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text(b.name, M, y); y += 14;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    const lines = doc.splitTextToSize(b.text || "—", W - M * 2);
    ensureSpace(lines.length * 12 + 10);
    doc.text(lines, M, y);
    y += lines.length * 12 + 12;
  }

  doc.save(`daily-${d.dailyNumber}-${d.productName.replace(/\s+/g, "_")}-${format(parseISO(d.statusDate), "yyyyMMdd")}.pdf`);
}