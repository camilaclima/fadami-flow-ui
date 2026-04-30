import html2canvas from "html2canvas";
import jsPDF from "jspdf";
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

const escapeHtml = (s: string) =>
  (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Build an offscreen DOM that visually mirrors the on-screen AI analysis. */
function buildAiHtml(d: DailyExportData): HTMLDivElement {
  const ins = d.insights ?? {};
  const wrap = document.createElement("div");
  wrap.style.cssText = `
    position: fixed; left: -10000px; top: 0;
    width: 794px; padding: 24px;
    background: #ffffff; color: #0f172a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px; line-height: 1.5;
  `;

  const card = (title: string, body: string, accent = "#6366f1") => `
    <div style="border:1px solid #e2e8f0; border-left:4px solid ${accent}; border-radius:10px; padding:14px 16px; margin-bottom:12px; background:#ffffff; page-break-inside: avoid;">
      <div style="font-weight:700; font-size:13px; color:#0f172a; margin-bottom:8px;">${escapeHtml(title)}</div>
      <div style="color:#334155; font-size:12.5px;">${body}</div>
    </div>
  `;

  const list = (items: string[]) =>
    items.length === 0
      ? `<div style="color:#94a3b8; font-style:italic;">—</div>`
      : `<ul style="margin:0; padding-left:18px;">${items.map((i) => `<li style="margin:3px 0;">${escapeHtml(i)}</li>`).join("")}</ul>`;

  const header = `
    <div style="margin-bottom:18px; padding-bottom:12px; border-bottom:2px solid #e2e8f0;">
      <div style="font-size:20px; font-weight:800; color:#0f172a; margin-bottom:4px;">
        Daily #${d.dailyNumber} — ${escapeHtml(d.productName)}
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:8px; font-size:11.5px; color:#475569; margin-top:8px;">
        <span style="padding:3px 10px; background:#f1f5f9; border-radius:999px;">📅 ${format(parseISO(d.statusDate), "dd/MM/yyyy", { locale: ptBR })}</span>
        <span style="padding:3px 10px; background:#f1f5f9; border-radius:999px;">🏃 Sprint: ${escapeHtml(d.sprintLabel || "—")}</span>
        <span style="padding:3px 10px; background:#fef3c7; color:#92400e; border-radius:999px;">⚠️ Bloqueio IA ${d.blockerLevel}/5</span>
        <span style="padding:3px 10px; background:#e0e7ff; color:#3730a3; border-radius:999px;">👥 ${d.presentMembers.length} presente(s)</span>
      </div>
      ${d.presentMembers.length ? `<div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:4px;">${d.presentMembers.map((n) => `<span style="font-size:10.5px; background:#f8fafc; border:1px solid #e2e8f0; padding:2px 8px; border-radius:999px; color:#475569;">${escapeHtml(n)}</span>`).join("")}</div>` : ""}
    </div>
  `;

  const sectionTitle = `<div style="font-size:15px; font-weight:700; color:#0f172a; margin: 18px 0 10px; display:flex; align-items:center; gap:8px;">
    <span style="display:inline-block; width:4px; height:18px; background:#6366f1; border-radius:2px;"></span>
    Análise da IA
  </div>`;

  let body = header + sectionTitle;

  if (ins.resumo_executivo) {
    body += card(
      "📋 Resumo Executivo",
      `<div style="font-style:italic; color:#475569;">${escapeHtml(ins.resumo_executivo)}</div>`,
      "#6366f1",
    );
  }

  // Three-column row: Avanços / Riscos / Recorrências
  body += `<div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom:12px;">
    <div style="border:1px solid #d1fae5; border-radius:10px; padding:12px; background:#ecfdf5; page-break-inside: avoid;">
      <div style="font-weight:700; color:#047857; margin-bottom:6px; font-size:12px;">✅ Avanços</div>
      ${list(ins.avancos ?? [])}
    </div>
    <div style="border:1px solid #fde68a; border-radius:10px; padding:12px; background:#fffbeb; page-break-inside: avoid;">
      <div style="font-weight:700; color:#b45309; margin-bottom:6px; font-size:12px;">⚠️ Riscos</div>
      ${list(ins.riscos ?? [])}
    </div>
    <div style="border:1px solid #fecaca; border-radius:10px; padding:12px; background:#fef2f2; page-break-inside: avoid;">
      <div style="font-weight:700; color:#b91c1c; margin-bottom:6px; font-size:12px;">🔥 Recorrências</div>
      ${(ins.recorrencias ?? []).length === 0
        ? `<div style="color:#94a3b8; font-style:italic;">—</div>`
        : `<ul style="margin:0; padding-left:16px;">${(ins.recorrencias ?? []).map((r) => `<li style="margin:3px 0;">${escapeHtml(r.descricao)} <span style="background:#dc2626;color:#fff;border-radius:999px;padding:1px 6px;font-size:10px;">${r.dias_consecutivos}d</span>${r.responsavel ? `<div style="font-size:10.5px;color:#64748b;">Resp: ${escapeHtml(r.responsavel)}</div>` : ""}</li>`).join("")}</ul>`}
    </div>
  </div>`;

  if (ins.colaboradores_ociosos?.length || ins.colaboradores_sobrecarregados?.length) {
    body += `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:12px;">`;
    if (ins.colaboradores_ociosos?.length) {
      body += card(
        "👤 Colaboradores Ociosos",
        `<ul style="margin:0; padding-left:18px;">${ins.colaboradores_ociosos.map((o) => `<li style="margin:3px 0;"><strong>${escapeHtml(o.nome)}</strong> — ${escapeHtml(o.motivo)}</li>`).join("")}</ul>`,
        "#3b82f6",
      );
    }
    if (ins.colaboradores_sobrecarregados?.length) {
      body += card(
        "🔥 Sobrecarregados",
        `<ul style="margin:0; padding-left:18px;">${ins.colaboradores_sobrecarregados.map((s) => `<li style="margin:3px 0;"><strong>${escapeHtml(s.nome)}</strong> — ${escapeHtml(s.motivo)} <span style="font-size:10px;background:#fed7aa;color:#9a3412;padding:1px 6px;border-radius:999px;">${escapeHtml(s.nivel_risco)}</span></li>`).join("")}</ul>`,
        "#ea580c",
      );
    }
    body += `</div>`;
  }

  if (ins.dependencias_externas?.length) {
    body += card(
      "🔗 Dependências Externas",
      `<ul style="margin:0; padding-left:18px;">${ins.dependencias_externas.map((x) => `<li style="margin:3px 0;">${escapeHtml(x.item)} — <em>${escapeHtml(x.bloqueador)}</em> <span style="font-size:10px;background:#dbeafe;color:#1e40af;padding:1px 6px;border-radius:999px;">${escapeHtml(x.tipo)}</span></li>`).join("")}</ul>`,
      "#2563eb",
    );
  }

  if (ins.avancos_consolidados?.length) {
    body += card("📈 Avanços Consolidados", list(ins.avancos_consolidados), "#059669");
  }
  if (ins.prospeccao_riscos?.length) {
    body += card("🔭 Prospecção de Riscos", list(ins.prospeccao_riscos), "#d97706");
  }
  if (ins.proximos_passos?.length) {
    body += card("🎯 Próximos Passos", list(ins.proximos_passos), "#6366f1");
  }

  // Raw report at the END
  const blocks = parseRawReport(d.rawSummary);
  body += `<div style="font-size:15px; font-weight:700; color:#0f172a; margin: 24px 0 10px; padding-top:14px; border-top:2px solid #e2e8f0; display:flex; align-items:center; gap:8px;">
    <span style="display:inline-block; width:4px; height:18px; background:#94a3b8; border-radius:2px;"></span>
    Relatório Bruto
  </div>`;
  if (blocks.length === 0) {
    body += `<div style="color:#94a3b8; font-style:italic;">Sem texto registrado.</div>`;
  } else {
    for (const b of blocks) {
      const isMeta = /observa|coordena/i.test(b.name);
      const accent = isMeta ? "#f59e0b" : "#6366f1";
      const bg = isMeta ? "#fffbeb" : "#ffffff";
      body += `
        <div style="border:1px solid #e2e8f0; border-left:4px solid ${accent}; border-radius:10px; padding:12px 14px; margin-bottom:10px; background:${bg}; page-break-inside: avoid;">
          <div style="font-weight:700; font-size:12.5px; color:#0f172a; margin-bottom:6px;">${escapeHtml(b.name)}</div>
          <div style="white-space:pre-wrap; color:#334155; font-size:12px;">${escapeHtml(b.text || "—")}</div>
        </div>
      `;
    }
  }

  wrap.innerHTML = body;
  return wrap;
}

export async function downloadDailyReportPdf(d: DailyExportData) {
  const node = buildAiHtml(d);
  document.body.appendChild(node);
  try {
    const canvas = await html2canvas(node, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: node.scrollWidth,
    });

    const margin = 24;
    const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;

    const pxPerPt = canvas.width / contentWidth;
    const pageHeightPx = Math.floor(contentHeight * pxPerPt);

    let renderedPx = 0;
    let pageIndex = 0;
    while (renderedPx < canvas.height) {
      const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedPx);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = sliceHeightPx;
      const ctx = slice.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
      const data = slice.toDataURL("image/jpeg", 0.92);
      const sliceHeightPt = sliceHeightPx / pxPerPt;
      if (pageIndex > 0) pdf.addPage();
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      pdf.addImage(data, "JPEG", margin, margin, contentWidth, sliceHeightPt);
      renderedPx += sliceHeightPx;
      pageIndex += 1;
    }

    pdf.save(`daily-${d.dailyNumber}-${d.productName.replace(/\s+/g, "_")}-${format(parseISO(d.statusDate), "yyyyMMdd")}.pdf`);
  } finally {
    document.body.removeChild(node);
  }
}
