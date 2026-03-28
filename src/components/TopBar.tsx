import { useRef, useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { getPdfDocument, computePageMetas } from "@/lib/pdfRender";
import {
  buildMergedPdf,
  buildMergedPageJpeg,
  buildMergedPagePng,
} from "@/lib/exportPdf";
import styles from "./TopBar.module.css";

function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function TopBar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pdfBytes = useEditorStore((s) => s.pdfBytes);
  const fileName = useEditorStore((s) => s.fileName);
  const setPdf = useEditorStore((s) => s.setPdf);
  const clearPdf = useEditorStore((s) => s.clearPdf);
  const pageCount = useEditorStore((s) => s.pageCount);
  const currentPage = useEditorStore((s) => s.currentPage);
  const overlays = useEditorStore((s) => s.overlays);
  const renderScale = useEditorStore((s) => s.renderScale);
  const setRenderScale = useEditorStore((s) => s.setRenderScale);
  const zoom = useEditorStore((s) => s.zoom);
  const zoomIn = useEditorStore((s) => s.zoomIn);
  const zoomOut = useEditorStore((s) => s.zoomOut);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const projectName = useEditorStore((s) => s.projectName);
  const setProjectName = useEditorStore((s) => s.setProjectName);
  const historyPast = useEditorStore((s) => s.historyPast[currentPage]?.length ?? 0);
  const historyFuture = useEditorStore((s) => s.historyFuture[currentPage]?.length ?? 0);

  const onFile = async (f: File | null) => {
    if (!f || f.type !== "application/pdf") return;
    const bytes = await f.arrayBuffer();
    const stored = bytes.slice(0);
    const pdf = await getPdfDocument(stored.slice(0));
    const scale = useEditorStore.getState().renderScale;
    const metas = await computePageMetas(pdf, scale);
    await pdf.destroy();
    setPdf(stored, f.name, metas, metas.length);
  };

  const exportPdf = async () => {
    if (!pdfBytes) return;
    setBusy(true);
    try {
      const out = await buildMergedPdf(pdfBytes, overlays, renderScale);
      const base = (fileName ?? "edited").replace(/\.pdf$/i, "");
      downloadBlob(
        new Blob([out as BlobPart], { type: "application/pdf" }),
        `${base}-edited.pdf`
      );
    } finally {
      setBusy(false);
    }
  };

  const exportPng = async () => {
    if (!pdfBytes) return;
    setBusy(true);
    try {
      const blob = await buildMergedPagePng(
        pdfBytes,
        currentPage,
        overlays[currentPage] ?? null,
        renderScale
      );
      const base = (fileName ?? "page").replace(/\.pdf$/i, "");
      downloadBlob(blob, `${base}-page-${currentPage + 1}.png`);
    } finally {
      setBusy(false);
    }
  };

  const exportJpg = async () => {
    if (!pdfBytes) return;
    setBusy(true);
    try {
      const blob = await buildMergedPageJpeg(
        pdfBytes,
        currentPage,
        overlays[currentPage] ?? null,
        renderScale
      );
      const base = (fileName ?? "page").replace(/\.pdf$/i, "");
      downloadBlob(blob, `${base}-page-${currentPage + 1}.jpg`);
    } finally {
      setBusy(false);
    }
  };

  const saveProject = () => {
    if (!pdfBytes) return;
    const payload = {
      v: 1,
      projectName,
      fileName,
      renderScale,
      overlays,
      pageCount,
    };
    const json = JSON.stringify(payload);
    downloadBlob(
      new Blob([json], { type: "application/json" }),
      `${(fileName ?? "project").replace(/\.pdf$/i, "")}.pdfedit.json`
    );
  };

  const loadProjectInputRef = useRef<HTMLInputElement>(null);
  const onLoadProject = async (f: File | null) => {
    if (!f) return;
    const text = await f.text();
    try {
      const o = JSON.parse(text) as {
        v: number;
        projectName?: string;
        fileName?: string | null;
        renderScale?: number;
        overlays?: Record<number, string | null>;
        pageCount?: number;
      };
      if (o.v !== 1 || !o.overlays) return;
      if (o.projectName) setProjectName(o.projectName);
      if (typeof o.renderScale === "number") setRenderScale(o.renderScale);
      useEditorStore.setState({
        overlays: o.overlays,
        pageCount: o.pageCount ?? Object.keys(o.overlays).length,
        currentPage: 0,
        selectedShapeId: null,
      });
      alert(
        "Project overlays loaded. Re-upload the same PDF file to restore the canvas."
      );
    } catch {
      alert("Invalid project file");
    }
  };

  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <span className={styles.logo}>PDF Editor</span>
        <input
          className={styles.proj}
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          aria-label="Project name"
        />
      </div>
      <div className={styles.mid}>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          className={styles.primary}
          onClick={() => fileInputRef.current?.click()}
        >
          Open PDF
        </button>
        {pdfBytes && (
          <button type="button" className={styles.ghost} onClick={() => clearPdf()}>
            Close
          </button>
        )}
        <span className={styles.sep} />
        <button
          type="button"
          className={styles.ghost}
          disabled={!pdfBytes || historyPast === 0}
          onClick={() => undo()}
          title="Ctrl+Z"
        >
          Undo
        </button>
        <button
          type="button"
          className={styles.ghost}
          disabled={!pdfBytes || historyFuture === 0}
          onClick={() => redo()}
          title="Ctrl+Shift+Z"
        >
          Redo
        </button>
        <span className={styles.sep} />
        <button
          type="button"
          className={styles.ghost}
          disabled={!pdfBytes}
          onClick={() => zoomOut()}
        >
          −
        </button>
        <span className={styles.zoom}>{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          className={styles.ghost}
          disabled={!pdfBytes}
          onClick={() => zoomIn()}
        >
          +
        </button>
        <label className={styles.scaleLbl}>
          Render scale
          <input
            type="range"
            min={1}
            max={4}
            step={0.25}
            value={renderScale}
            disabled={!pdfBytes}
            onChange={(e) => setRenderScale(Number(e.target.value))}
            title="Higher = sharper PDF raster (re-open PDF to apply to all pages)"
          />
        </label>
      </div>
      <div className={styles.right}>
        <button
          type="button"
          className={styles.ghost}
          disabled={!pdfBytes || busy}
          onClick={() => exportPdf()}
        >
          Export PDF
        </button>
        <button
          type="button"
          className={styles.ghost}
          disabled={!pdfBytes || busy}
          onClick={() => exportPng()}
        >
          PNG
        </button>
        <button
          type="button"
          className={styles.ghost}
          disabled={!pdfBytes || busy}
          onClick={() => exportJpg()}
        >
          JPG
        </button>
        <input
          ref={loadProjectInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => onLoadProject(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          className={styles.ghost}
          disabled={!pdfBytes}
          onClick={() => saveProject()}
        >
          Save project
        </button>
        <button
          type="button"
          className={styles.ghost}
          onClick={() => loadProjectInputRef.current?.click()}
        >
          Load project
        </button>
        {busy && <span className={styles.busy}>Exporting…</span>}
      </div>
    </header>
  );
}
