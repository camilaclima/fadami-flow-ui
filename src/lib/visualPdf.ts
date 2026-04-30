import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Capture a DOM node and download it as a multi-page PDF preserving the
 * on-screen visual. Uses A4 portrait by default.
 */
export async function downloadElementAsPdf(node: HTMLElement, fileName: string) {
  // Force light-friendly background to avoid black bleed for transparent areas
  const bg = getComputedStyle(document.body).backgroundColor || "#ffffff";
  const canvas = await html2canvas(node, {
    backgroundColor: bg,
    scale: 2,
    useCORS: true,
    logging: false,
    windowWidth: node.scrollWidth,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(fileName);
}