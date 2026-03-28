import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { getPdfDocument, renderPageToCanvas } from "@/lib/pdfRender";
import { sampleAverageAround, sampleCanvasColor } from "@/lib/sampleColor";
import { useEditorStore } from "@/stores/editorStore";
import type { EditorShape } from "@/types/editor";
import { parseOverlayJson, stringifyOverlay } from "@/types/editor";
import { KonvaOverlay } from "./KonvaOverlay";
import styles from "./EditorStage.module.css";

export function EditorStage() {
  const pdfBytes = useEditorStore((s) => s.pdfBytes);
  const pageCount = useEditorStore((s) => s.pageCount);
  const currentPage = useEditorStore((s) => s.currentPage);
  const pageMetas = useEditorStore((s) => s.pageMetas);
  const renderScale = useEditorStore((s) => s.renderScale);
  const overlayRaw = useEditorStore(
    (s) => s.overlays[currentPage] ?? null
  );
  const setOverlayJson = useEditorStore((s) => s.setOverlayJson);
  const zoom = useEditorStore((s) => s.zoom);
  const showGrid = useEditorStore((s) => s.showGrid);
  const gridSize = useEditorStore((s) => s.gridSize);
  const toolMode = useEditorStore((s) => s.toolMode);
  const setToolMode = useEditorStore((s) => s.setToolMode);
  const setLastPickedColor = useEditorStore((s) => s.setLastPickedColor);
  const selectedId = useEditorStore((s) => s.selectedShapeId);
  const setSelectedId = useEditorStore((s) => s.setSelectedShapeId);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);

  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const pageCanvasCache = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    pageCanvasCache.current.clear();
  }, [pdfBytes, renderScale]);

  const meta = pageMetas[currentPage];
  const w = meta?.width ?? 0;
  const h = meta?.height ?? 0;

  const shapes = useMemo(
    () => parseOverlayJson(overlayRaw).shapes,
    [overlayRaw]
  );

  const commit = useCallback(
    (next: EditorShape[]) => {
      setOverlayJson(currentPage, stringifyOverlay({ v: 1, shapes: next }));
    },
    [currentPage, setOverlayJson]
  );

  useEffect(() => {
    const el = (t: EventTarget | null) =>
      t instanceof HTMLInputElement ||
      t instanceof HTMLTextAreaElement ||
      (t instanceof HTMLElement && t.isContentEditable);

    const onKey = (e: KeyboardEvent) => {
      if (el(e.target)) return;
      const step = e.shiftKey ? 10 : 1;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "y" ||
          (e.key.toLowerCase() === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
        return;
      }
      if (!selectedId) return;
      if (e.key === "Delete") {
        e.preventDefault();
        const next = shapes.filter((s) => s.id !== selectedId);
        commit(next);
        setSelectedId(null);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const src = shapes.find((s) => s.id === selectedId);
        if (!src) return;
        const copy: EditorShape =
          src.type === "text"
            ? { ...src, id: uuidv4(), x: src.x + 12, y: src.y + 12 }
            : { ...src, id: uuidv4(), x: src.x + 12, y: src.y + 12 };
        commit([...shapes, copy]);
        setSelectedId(copy.id);
        return;
      }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        const dx =
          e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy =
          e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        const next = shapes.map((s) =>
          s.id === selectedId
            ? { ...s, x: s.x + dx, y: s.y + dy }
            : s
        );
        commit(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shapes, selectedId, commit, setSelectedId, undo, redo]);

  useEffect(() => {
    if (!pdfBytes || pageCount === 0 || !meta) return;
    let cancelled = false;
    (async () => {
      const cache = pageCanvasCache.current;
      if (cache.has(currentPage)) {
        const c = cache.get(currentPage)!;
        drawPdfToDisplay(c);
        return;
      }
      setRendering(true);
      try {
        const pdf = await getPdfDocument(pdfBytes.slice(0));
        const { canvas } = await renderPageToCanvas(
          pdf,
          currentPage,
          renderScale
        );
        await pdf.destroy();
        if (cancelled) return;
        cache.set(currentPage, canvas);
        drawPdfToDisplay(canvas);
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfBytes, pageCount, currentPage, meta, renderScale]);

  function drawPdfToDisplay(source: HTMLCanvasElement) {
    const dest = pdfCanvasRef.current;
    if (!dest) return;
    dest.width = source.width;
    dest.height = source.height;
    const ctx = dest.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(source, 0, 0);
  }

  const onPdfClickEyedropper = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (toolMode !== "eyedropper") return;
    const c = pdfCanvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * c.width;
    const sy = ((e.clientY - rect.top) / rect.height) * c.height;
    const hex = sampleCanvasColor(c, sx, sy);
    setLastPickedColor(hex);
    setToolMode("select");
  };

  const onPdfClickSampleCover = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (toolMode !== "cover") return;
    const c = pdfCanvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * c.width;
    const sy = ((e.clientY - rect.top) / rect.height) * c.height;
    const avg = sampleAverageAround(c, sx, sy, 5);
    setLastPickedColor(avg);
  };

  if (!pdfBytes || !meta) {
    return (
      <div className={styles.empty}>
        <p>Upload a PDF to start editing</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {rendering && <div className={styles.rendering}>Rendering page…</div>}
      <div
        className={styles.scroller}
        style={{
          backgroundImage: showGrid
            ? `
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
          `
            : undefined,
          backgroundSize: showGrid ? `${gridSize * zoom}px ${gridSize * zoom}px` : undefined,
        }}
      >
        <div
          className={styles.scaled}
          style={{
            width: w * zoom,
            height: h * zoom,
          }}
        >
          <div
            className={styles.inner}
            style={{
              width: w,
              height: h,
              transform: `scale(${zoom})`,
            }}
          >
            <canvas
              ref={pdfCanvasRef}
              className={styles.pdfCanvas}
              width={w}
              height={h}
              onClick={(e) => {
                onPdfClickEyedropper(e);
                onPdfClickSampleCover(e);
              }}
              style={{
                pointerEvents:
                  toolMode === "eyedropper" || toolMode === "cover"
                    ? "auto"
                    : "none",
              }}
            />
            <KonvaOverlay width={w} height={h} shapes={shapes} commit={commit} />
          </div>
        </div>
      </div>
    </div>
  );
}
