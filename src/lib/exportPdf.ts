import { PDFDocument } from "pdf-lib";
import { compositePageToBlob } from "@/lib/mergeExport";
import { renderShapesToDataURL } from "@/lib/konvaSnapshot";
import { getPdfDocument, renderPageToCanvas } from "@/lib/pdfRender";
import { parseOverlayJson } from "@/types/editor";

/**
 * Re-rasterize every page and composite stored overlays into a new PDF.
 * Uses the same render scale as the editor for WYSIWYG output.
 */
export async function buildMergedPdf(
  pdfBytes: ArrayBuffer,
  overlays: Record<number, string | null>,
  renderScale: number
): Promise<Uint8Array> {
  const pdfJs = await getPdfDocument(pdfBytes.slice(0));
  const pdfLib = await PDFDocument.load(pdfBytes);
  const libPages = pdfLib.getPages();
  const n = pdfJs.numPages;
  const mergedPages: {
    imageBytes: Uint8Array;
    widthPt: number;
    heightPt: number;
  }[] = [];

  try {
    for (let i = 0; i < n; i++) {
      const { canvas, meta } = await renderPageToCanvas(pdfJs, i, renderScale);
      const shapes = parseOverlayJson(overlays[i] ?? null).shapes;
      const overlayUrl = await renderShapesToDataURL(
        shapes,
        meta.width,
        meta.height
      );
      const blob = await compositePageToBlob(
        {
          width: meta.width,
          height: meta.height,
          pdfCanvas: canvas,
          overlayDataUrl: overlayUrl,
        },
        "image/png"
      );
      const imageBytes = new Uint8Array(await blob.arrayBuffer());
      const { width, height } = libPages[i].getSize();
      mergedPages.push({
        imageBytes,
        widthPt: width,
        heightPt: height,
      });
    }
  } finally {
    await pdfJs.destroy();
  }

  const out = await PDFDocument.create();
  for (const p of mergedPages) {
    const png = await out.embedPng(p.imageBytes);
    const page = out.addPage([p.widthPt, p.heightPt]);
    page.drawImage(png, {
      x: 0,
      y: 0,
      width: p.widthPt,
      height: p.heightPt,
    });
  }
  return out.save();
}

export async function buildMergedPagePng(
  pdfBytes: ArrayBuffer,
  pageIndex: number,
  overlayJson: string | null,
  renderScale: number
): Promise<Blob> {
  const pdfJs = await getPdfDocument(pdfBytes.slice(0));
  try {
    const { canvas, meta } = await renderPageToCanvas(
      pdfJs,
      pageIndex,
      renderScale
    );
    const shapes = parseOverlayJson(overlayJson).shapes;
    const overlayUrl = await renderShapesToDataURL(
      shapes,
      meta.width,
      meta.height
    );
    return compositePageToBlob(
      {
        width: meta.width,
        height: meta.height,
        pdfCanvas: canvas,
        overlayDataUrl: overlayUrl,
      },
      "image/png"
    );
  } finally {
    await pdfJs.destroy();
  }
}

export async function buildMergedPageJpeg(
  pdfBytes: ArrayBuffer,
  pageIndex: number,
  overlayJson: string | null,
  renderScale: number,
  quality = 0.92
): Promise<Blob> {
  const pdfJs = await getPdfDocument(pdfBytes.slice(0));
  try {
    const { canvas, meta } = await renderPageToCanvas(
      pdfJs,
      pageIndex,
      renderScale
    );
    const shapes = parseOverlayJson(overlayJson).shapes;
    const overlayUrl = await renderShapesToDataURL(
      shapes,
      meta.width,
      meta.height
    );
    return compositePageToBlob(
      {
        width: meta.width,
        height: meta.height,
        pdfCanvas: canvas,
        overlayDataUrl: overlayUrl,
      },
      "image/jpeg",
      quality
    );
  } finally {
    await pdfJs.destroy();
  }
}
