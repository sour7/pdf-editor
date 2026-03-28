import * as pdfjsLib from "pdfjs-dist";
import type { PageMeta } from "@/types/editor";

/**
 * Rasterize a single PDF page to an HTMLCanvasElement at the given scale.
 * Scale multiplies the PDF's native user-space units for sharper output.
 */
export async function renderPageToCanvas(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageIndex: number,
  scale: number
): Promise<{ canvas: HTMLCanvasElement; meta: PageMeta }> {
  const page = await pdf.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context not available");

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  const meta: PageMeta = {
    width: canvas.width,
    height: canvas.height,
    renderScale: scale,
  };
  return { canvas, meta };
}

/**
 * Load PDF from ArrayBuffer and return document + per-page dimensions at scale 1
 * (used to plan layout before full rasterize).
 */
export async function getPdfDocument(
  data: ArrayBuffer
): Promise<pdfjsLib.PDFDocumentProxy> {
  // Copy — pdf.js may transfer the underlying buffer to the worker thread.
  const task = pdfjsLib.getDocument({ data: new Uint8Array(data.slice(0)) });
  return task.promise;
}

export async function computePageMetas(
  pdf: pdfjsLib.PDFDocumentProxy,
  scale: number
): Promise<PageMeta[]> {
  const n = pdf.numPages;
  const metas: PageMeta[] = [];
  for (let i = 0; i < n; i++) {
    const page = await pdf.getPage(i + 1);
    const vp = page.getViewport({ scale });
    metas.push({
      width: Math.ceil(vp.width),
      height: Math.ceil(vp.height),
      renderScale: scale,
    });
  }
  return metas;
}
