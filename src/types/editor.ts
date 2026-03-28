export type ToolMode = "select" | "text" | "cover" | "eyedropper";

export interface PageMeta {
  width: number;
  height: number;
  renderScale: number;
}

/** Konva text node serializable subset */
export interface TextShape {
  id: string;
  type: "text";
  x: number;
  y: number;
  rotation: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  fill: string;
  letterSpacing: number;
  lineHeight: number;
  align: "left" | "center" | "right";
  width: number;
  locked?: boolean;
}

/** Cover rectangle to hide underlying scan text */
export interface CoverShape {
  id: string;
  type: "cover";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  opacity: number;
  /** Optional subtle blur hint (Konva blurRadius) */
  blurRadius?: number;
  locked?: boolean;
}

export type EditorShape = TextShape | CoverShape;

export interface OverlayDocument {
  v: 1;
  shapes: EditorShape[];
}

export function parseOverlayJson(raw: string | null): OverlayDocument {
  if (!raw) return { v: 1, shapes: [] };
  try {
    const o = JSON.parse(raw) as OverlayDocument;
    if (o && o.v === 1 && Array.isArray(o.shapes)) return o;
  } catch {
    /* ignore */
  }
  return { v: 1, shapes: [] };
}

export function stringifyOverlay(doc: OverlayDocument): string {
  return JSON.stringify(doc);
}
