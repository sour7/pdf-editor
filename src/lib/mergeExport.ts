import { PDFDocument } from "pdf-lib";
import type { OverlayDocument } from "@/types/editor";
import { parseOverlayJson, stringifyOverlay } from "@/types/editor";

export interface PageBitmaps {
  width: number;
  height: number;
  /** Rasterized PDF page (same pixel size as overlay) */
  pdfCanvas: HTMLCanvasElement;
  /** Konva objects layer only — transparent background */
  overlayDataUrl: string;
}

/** Composite PDF raster + overlay PNG (async so the data URL decodes reliably). */
export async function compositePageToCanvas(
  page: PageBitmaps
): Promise<HTMLCanvasElement> {
  const { width, height, pdfCanvas, overlayDataUrl } = page;
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Cannot get 2d context");
  ctx.drawImage(pdfCanvas, 0, 0);
  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      resolve();
    };
    img.onerror = () => reject(new Error("Overlay image failed to load"));
    img.src = overlayDataUrl;
  });
  return out;
}

export async function compositePageToBlob(
  page: PageBitmaps,
  type: "image/png" | "image/jpeg",
  quality?: number
): Promise<Blob> {
  const merged = await compositePageToCanvas(page);
  const q = type === "image/jpeg" ? quality ?? 0.92 : undefined;
  return new Promise((resolve, reject) => {
    merged.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      type,
      q
    );
  });
}

/**
 * Build a multi-page PDF from merged page images (one raster per page).
 * Dimensions match the original PDF page sizes in points so scaling stays consistent.
 */
export async function buildPdfFromMergedPages(
  pages: { imageBytes: Uint8Array; widthPt: number; heightPt: number }[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const p of pages) {
    const png = await doc.embedPng(p.imageBytes);
    const page = doc.addPage([p.widthPt, p.heightPt]);
    page.drawImage(png, {
      x: 0,
      y: 0,
      width: p.widthPt,
      height: p.heightPt,
    });
  }
  return doc.save();
}

/** Re-export for project save */
export { parseOverlayJson, stringifyOverlay };
export type { OverlayDocument };
