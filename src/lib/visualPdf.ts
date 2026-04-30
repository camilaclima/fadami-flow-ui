import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export interface VisualPdfOptions {
  /** Page margin in points. Default 28. */
  margin?: number;
  /** Background color used to fill the margin & avoid bleed. Default white. */
  background?: string;
  /** JPEG quality (0..1). Default 0.92. */
  quality?: number;
  /** Render scale for html2canvas. Default 2. */
  scale?: number;
  /** Width (px) used for offscreen rendering. Default 1100. */
  renderWidth?: number;
}

/**
 * Light theme CSS overrides applied to the cloned node so the exported PDF
 * always has a clean white background regardless of the active theme.
 * We reset the most relevant shadcn/Tailwind HSL design tokens to light values
 * and force common dark backgrounds to white. We also harden card content so
 * badges/tags wrap inside their box and never overflow horizontally.
 */
const LIGHT_RESET_CSS = `
  .__pdf-export, .__pdf-export * {
    color: #0f172a !important;
    border-color: #e2e8f0 !important;
    box-shadow: none !important;
    text-shadow: none !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .__pdf-export {
    background: #ffffff !important;
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 35%;
    --accent: 210 40% 96%;
    --accent-foreground: 222 47% 11%;
    --border: 214 32% 91%;
    --input: 214 32% 91%;
  }
  /* Force any element with translucent dark fill to white. */
  .__pdf-export [class*="bg-background"],
  .__pdf-export [class*="bg-card"],
  .__pdf-export [class*="bg-popover"],
  .__pdf-export [class*="bg-muted"],
  .__pdf-export [class*="bg-accent"] {
    background-color: #ffffff !important;
  }
  .__pdf-export .text-muted-foreground { color: #64748b !important; }
  /* Containment: keep tags/badges inside cards (the on-screen layout uses
     flex-wrap; this hardens it for the canvas snapshot). */
  .__pdf-export [class*="flex-wrap"] { flex-wrap: wrap !important; }
  .__pdf-export [class*="overflow-x"] { overflow-x: hidden !important; }
  .__pdf-export table { table-layout: fixed !important; width: 100% !important; }
  .__pdf-export th, .__pdf-export td {
    word-break: break-word !important;
    overflow-wrap: anywhere !important;
    white-space: normal !important;
  }
  .__pdf-export .truncate {
    overflow: visible !important;
    text-overflow: clip !important;
    white-space: normal !important;
  }
  /* Badge / pill hardening: html2canvas tende a desalinhar texto x fundo em
     spans inline-block com line-height curto. Forçamos line-height fixo,
     vertical-align middle e padding um pouco mais generoso. */
  .__pdf-export [class*="rounded-full"],
  .__pdf-export [data-badge],
  .__pdf-export .badge {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    line-height: 1 !important;
    vertical-align: middle !important;
    white-space: nowrap !important;
    padding: 4px 10px !important;
    box-sizing: border-box !important;
  }
  /* Garante que containers de badges não cortem o conteúdo. */
  .__pdf-export [class*="gap-"] { align-items: center !important; }
`;

/**
 * Capture a DOM node and download it as a multi-page PDF preserving the
 * on-screen visual. The node is cloned into an off-screen container with a
 * forced white/light theme to guarantee a clean export, then sliced page by
 * page with white margins so content never gets cut at page boundaries.
 */
export async function downloadElementAsPdf(
  node: HTMLElement,
  fileName: string,
  options: VisualPdfOptions = {},
) {
  const margin = options.margin ?? 28;
  const bg = options.background ?? "#ffffff";
  const quality = options.quality ?? 0.92;
  const scale = options.scale ?? 2;
  const renderWidth = options.renderWidth ?? 1100;

  // Inject the light reset stylesheet once per export.
  const styleEl = document.createElement("style");
  styleEl.textContent = LIGHT_RESET_CSS;
  document.head.appendChild(styleEl);

  // Offscreen wrapper that owns the clone.
  const wrapper = document.createElement("div");
  wrapper.className = "__pdf-export";
  wrapper.style.cssText = `
    position: fixed;
    left: -10000px;
    top: 0;
    width: ${renderWidth}px;
    padding: 24px;
    background: ${bg};
    color: #0f172a;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  const clone = node.cloneNode(true) as HTMLElement;
  // Reset width on the clone so it fits the wrapper exactly.
  clone.style.width = "100%";
  clone.style.maxWidth = "100%";
  clone.style.background = bg;
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    const canvas = await html2canvas(wrapper, {
      backgroundColor: bg,
      scale,
      useCORS: true,
      logging: false,
      windowWidth: renderWidth,
    });

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
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(
        canvas,
        0, renderedPx, canvas.width, sliceHeightPx,
        0, 0, canvas.width, sliceHeightPx,
      );
      const data = slice.toDataURL("image/jpeg", quality);
      const sliceHeightPt = sliceHeightPx / pxPerPt;

      if (pageIndex > 0) pdf.addPage();
      // Paint the whole page white so margins are always clean.
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      pdf.addImage(data, "JPEG", margin, margin, contentWidth, sliceHeightPt);

      renderedPx += sliceHeightPx;
      pageIndex += 1;
    }

    pdf.save(fileName);
  } finally {
    document.body.removeChild(wrapper);
    document.head.removeChild(styleEl);
  }
}
