import { create } from "zustand";
import type { PageMeta, ToolMode } from "@/types/editor";

const DEFAULT_GRID = 8;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

export interface EditorState {
  pdfBytes: ArrayBuffer | null;
  fileName: string | null;
  pageCount: number;
  pageMetas: PageMeta[];
  currentPage: number;
  /** 0-based page index -> serialized fabric JSON (overlay only) */
  overlays: Record<number, string | null>;
  /** Per-page undo stacks (null = empty overlay for that page) */
  historyPast: Record<number, (string | null)[]>;
  historyFuture: Record<number, (string | null)[]>;
  renderScale: number;
  zoom: number;
  toolMode: ToolMode;
  showGrid: boolean;
  snapGrid: boolean;
  snapGuides: boolean;
  gridSize: number;
  /** Eyedropper / cover default fill */
  lastPickedColor: string;
  /** Loaded Google font families (CSS family names) */
  loadedFonts: Set<string>;
  projectName: string;
  /** Currently selected overlay shape on the active page (Konva id). */
  selectedShapeId: string | null;
  setSelectedShapeId: (id: string | null) => void;

  setPdf: (bytes: ArrayBuffer, name: string, metas: PageMeta[], count: number) => void;
  clearPdf: () => void;
  setCurrentPage: (n: number) => void;
  setOverlayJson: (pageIndex: number, json: string | null, skipHistory?: boolean) => void;
  pushHistorySnapshot: (pageIndex: number, json: string | null) => void;
  undo: () => void;
  redo: () => void;
  setZoom: (z: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setToolMode: (m: ToolMode) => void;
  toggleGrid: () => void;
  toggleSnapGrid: () => void;
  toggleSnapGuides: () => void;
  setGridSize: (n: number) => void;
  setLastPickedColor: (c: string) => void;
  markFontLoaded: (family: string) => void;
  setProjectName: (n: string) => void;
  setRenderScale: (s: number) => void;
}

const emptyHistory = (): Record<number, (string | null)[]> => ({});

export const useEditorStore = create<EditorState>((set, get) => ({
  pdfBytes: null,
  fileName: null,
  pageCount: 0,
  pageMetas: [],
  currentPage: 0,
  overlays: {},
  historyPast: {},
  historyFuture: {},
  renderScale: 2.5,
  zoom: 1,
  toolMode: "select",
  showGrid: false,
  snapGrid: true,
  snapGuides: true,
  gridSize: DEFAULT_GRID,
  lastPickedColor: "#ffffff",
  loadedFonts: new Set([
    "Arial",
    "Georgia",
    "Times New Roman",
    "Courier New",
    "Verdana",
    "DM Sans",
  ]),
  projectName: "Untitled",
  selectedShapeId: null,

  setSelectedShapeId: (id) => set({ selectedShapeId: id }),

  setPdf: (bytes, name, metas, count) =>
    set({
      pdfBytes: bytes,
      fileName: name,
      pageMetas: metas,
      pageCount: count,
      currentPage: 0,
      overlays: {},
      historyPast: emptyHistory(),
      historyFuture: emptyHistory(),
      selectedShapeId: null,
    }),

  clearPdf: () =>
    set({
      pdfBytes: null,
      fileName: null,
      pageCount: 0,
      pageMetas: [],
      currentPage: 0,
      overlays: {},
      historyPast: {},
      historyFuture: {},
      selectedShapeId: null,
    }),

  setCurrentPage: (n) => {
    const { pageCount } = get();
    if (pageCount === 0) return;
    set({
      currentPage: Math.max(0, Math.min(pageCount - 1, n)),
      selectedShapeId: null,
    });
  },

  setOverlayJson: (pageIndex, json, skipHistory = false) =>
    set((s) => {
      const next = { ...s.overlays, [pageIndex]: json };
      if (skipHistory) return { overlays: next };
      const past = { ...s.historyPast };
      const cur = s.overlays[pageIndex] ?? null;
      const stack = [...(past[pageIndex] ?? [])];
      stack.push(cur);
      const trimmed = stack.slice(-50);
      past[pageIndex] = trimmed;
      const future = { ...s.historyFuture, [pageIndex]: [] };
      return { overlays: next, historyPast: past, historyFuture: future };
    }),

  pushHistorySnapshot: (pageIndex, json) =>
    set((s) => {
      const past = { ...s.historyPast };
      const cur = s.overlays[pageIndex] ?? null;
      const stack = [...(past[pageIndex] ?? [])];
      stack.push(cur);
      past[pageIndex] = stack.slice(-50);
      return {
        overlays: { ...s.overlays, [pageIndex]: json },
        historyPast: past,
        historyFuture: { ...s.historyFuture, [pageIndex]: [] },
      };
    }),

  undo: () => {
    const s = get();
    const p = s.currentPage;
    const stack = s.historyPast[p] ?? [];
    if (stack.length === 0) return;
    const past = [...stack];
    const prev = past.pop()!;
    const cur = s.overlays[p] ?? null;
    const fut = [...(s.historyFuture[p] ?? []), cur];
    set({
      overlays: { ...s.overlays, [p]: prev },
      historyPast: { ...s.historyPast, [p]: past },
      historyFuture: { ...s.historyFuture, [p]: fut },
    });
  },

  redo: () => {
    const s = get();
    const p = s.currentPage;
    const fut = s.historyFuture[p] ?? [];
    if (fut.length === 0) return;
    const future = [...fut];
    const next = future.pop()!;
    const cur = s.overlays[p] ?? null;
    const past = [...(s.historyPast[p] ?? []), cur];
    set({
      overlays: { ...s.overlays, [p]: next },
      historyPast: { ...s.historyPast, [p]: past },
      historyFuture: { ...s.historyFuture, [p]: future },
    });
  },

  setZoom: (z) => set({ zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)) }),
  zoomIn: () => set((s) => ({ zoom: Math.min(MAX_ZOOM, s.zoom * 1.15) })),
  zoomOut: () => set((s) => ({ zoom: Math.max(MIN_ZOOM, s.zoom / 1.15) })),

  setToolMode: (m) => set({ toolMode: m }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleSnapGrid: () => set((s) => ({ snapGrid: !s.snapGrid })),
  toggleSnapGuides: () => set((s) => ({ snapGuides: !s.snapGuides })),
  setGridSize: (n) => set({ gridSize: Math.max(2, Math.min(64, n)) }),
  setLastPickedColor: (c) => set({ lastPickedColor: c }),
  markFontLoaded: (family) =>
    set((s) => {
      const next = new Set(s.loadedFonts);
      next.add(family);
      return { loadedFonts: next };
    }),
  setProjectName: (n) => set({ projectName: n }),
  setRenderScale: (renderScale) => set({ renderScale: Math.max(1, Math.min(4, renderScale)) }),
}));
