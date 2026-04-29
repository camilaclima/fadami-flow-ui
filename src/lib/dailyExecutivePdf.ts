import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ExecData {
  productName: string;
  total: number;
  avgBlocker: number;
  eficienciaDesbloqueio: number | null;
  vibe?: string;
  historicoGargalos: { descricao: string; ocorrencias: number; maxDias: number }[];
  ociosos: { nome: string; vezes: number; datas: string[] }[];
  sobrecarregados: { nome: string; vezes: number; nivel_risco: string }[];
  dependenciasExternas: { item: string; bloqueador: string; tipo: string }[];
  proximosPassos?: string[];
}

export function downloadExecutivePdf(d: ExecData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  let y = M;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Relatório Executivo de Daily Status", M, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Projeto: ${d.productName}`, M, y); y += 14;
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, M, y); y += 20;

  // Métricas resumidas
  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [["Métrica", "Valor"]],
    body: [
      ["Dailys registradas", String(d.total)],
      ["Bloqueio médio", `${d.avgBlocker.toFixed(1)} / 5`],
      ["Eficiência desbloqueio", d.eficienciaDesbloqueio != null ? `${d.eficienciaDesbloqueio.toFixed(1)} dias` : "—"],
      ["Vibe (última leitura)", d.vibe ?? "—"],
    ],
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: M, right: M },
  });
  y = (doc as any).lastAutoTable.finalY + 16;

  // Gargalos
  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text("Histórico de Gargalos", M, y); y += 8;
  autoTable(doc, {
    startY: y + 4,
    theme: "striped",
    head: [["Descrição", "Ocorrências", "Máx. dias"]],
    body: d.historicoGargalos.length
      ? d.historicoGargalos.map((g) => [g.descricao, String(g.ocorrencias), `${g.maxDias}d`])
      : [["Sem gargalos registrados.", "", ""]],
    headStyles: { fillColor: [220, 38, 38] },
    margin: { left: M, right: M },
  });
  y = (doc as any).lastAutoTable.finalY + 16;

  // Radar de alocação
  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text("Radar de Alocação", M, y); y += 8;
  autoTable(doc, {
    startY: y + 4,
    theme: "grid",
    head: [["Tipo", "Colaborador", "Detalhe"]],
    body: [
      ...d.ociosos.map((o) => ["Ocioso", o.nome, `${o.vezes}x · ${o.datas.length} datas`]),
      ...d.sobrecarregados.map((s) => ["Sobrecarregado", s.nome, `${s.vezes}x · risco ${s.nivel_risco}`]),
      ...(d.ociosos.length + d.sobrecarregados.length === 0 ? [["—", "Sem alertas", ""]] : []),
    ],
    headStyles: { fillColor: [234, 88, 12] },
    margin: { left: M, right: M },
  });
  y = (doc as any).lastAutoTable.finalY + 16;

  // Dependências
  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text("Mapa de Dependências Externas", M, y); y += 8;
  autoTable(doc, {
    startY: y + 4,
    theme: "grid",
    head: [["Item", "Bloqueador", "Tipo"]],
    body: d.dependenciasExternas.length
      ? d.dependenciasExternas.map((x) => [x.item, x.bloqueador, x.tipo])
      : [["Nenhuma dependência registrada.", "", ""]],
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: M, right: M },
  });
  y = (doc as any).lastAutoTable.finalY + 16;

  // Próximos passos
  if (d.proximosPassos?.length) {
    if (y > 720) { doc.addPage(); y = M; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text("Próximos Passos Sugeridos", M, y); y += 14;
    doc.setFont("helvetica", "normal"); doc.setFontSize(11);
    for (const p of d.proximosPassos) {
      const lines = doc.splitTextToSize(`• ${p}`, W - M * 2);
      doc.text(lines, M, y);
      y += lines.length * 14 + 2;
      if (y > 780) { doc.addPage(); y = M; }
    }
  }

  doc.save(`relatorio-executivo-${d.productName.replace(/\s+/g, "_")}-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
}