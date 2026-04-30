import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export interface VisualPdfOptions {
  /** Page margin in points. Default 24. */
  margin?: number;
  /** Background color used to fill the margin & avoid black bleed. Default white. */
  background?: string;
  /** JPEG quality (0..1). Default 0.92. */
  quality?: number;
  /** Render scale for html2canvas. Default 2. */
  scale?: number;
}

/**
 * Capture a DOM node and download it as a multi-page PDF preserving the
 * on-screen visual. Uses A4 portrait by default. Adds white margins on every
 * page and slices the captured image so content does not get cropped at page
 * boundaries.
 */
export async function downloadElementAsPdf(
  node: HTMLElement,
  fileName: string,
  options: VisualPdfOptions = {},
) {
  const margin = options.margin ?? 24;
  // Force a light, opaque background to avoid black/transparent bleed.
  const bg = options.background ?? "#ffffff";
  const quality = options.quality ?? 0.92;
  const scale = options.scale ?? 2;

  const canvas = await html2canvas(node, {
    backgroundColor: bg,
    scale,
    useCORS: true,
    logging: false,
    windowWidth: node.scrollWidth,
  });

  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  // Map page content area back to source canvas pixels.
  const pxPerPt = canvas.width / contentWidth;
  const pageHeightPx = Math.floor(contentHeight * pxPerPt);

  // Slice the captured canvas into page-sized chunks. Each chunk is drawn on a
  // fresh canvas filled with the background color so margins stay clean.
  let renderedPx = 0;
  let pageIndex = 0;
  while (renderedPx < canvas.height) {
    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedPx);
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeightPx;
    const ctx = sliceCanvas.getContext("2d")!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(
      canvas,
      0, renderedPx, canvas.width, sliceHeightPx,
      0, 0, canvas.width, sliceHeightPx,
    );
    const sliceData = sliceCanvas.toDataURL("image/jpeg", quality);
    const sliceHeightPt = sliceHeightPx / pxPerPt;
    if (pageIndex > 0) pdf.addPage();
    // Fill the whole page with background to keep margins white.
    pdf.setFillColor(bg);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");
    pdf.addImage(sliceData, "JPEG", margin, margin, contentWidth, sliceHeightPt);
    renderedPx += sliceHeightPx;
    pageIndex += 1;
  }

  pdf.save(fileName);
}