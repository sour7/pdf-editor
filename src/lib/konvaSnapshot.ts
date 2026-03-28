import Konva from "konva";
import type { EditorShape } from "@/types/editor";

/**
 * Rasterize overlay shapes off-screen so exports match the editor without
 * depending on the live Stage instance (needed for multi-page PDF export).
 */
export async function renderShapesToDataURL(
  shapes: EditorShape[],
  width: number,
  height: number
): Promise<string> {
  await document.fonts.ready;
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;left:-10000px;top:0;opacity:0;pointer-events:none;";
  document.body.appendChild(container);
  const stage = new Konva.Stage({
    container,
    width,
    height,
  });
  const layer = new Konva.Layer();
  for (const s of shapes) {
    if (s.type === "text") {
      layer.add(
        new Konva.Text({
          id: s.id,
          x: s.x,
          y: s.y,
          rotation: s.rotation,
          text: s.text,
          fontSize: s.fontSize,
          fontFamily: s.fontFamily,
          fontStyle: s.fontStyle,
          fill: s.fill,
          letterSpacing: s.letterSpacing,
          lineHeight: s.lineHeight,
          align: s.align,
          width: s.width,
        })
      );
    } else {
      layer.add(
        new Konva.Rect({
          id: s.id,
          x: s.x,
          y: s.y,
          width: s.width,
          height: s.height,
          rotation: s.rotation,
          fill: s.fill,
          opacity: s.opacity,
        })
      );
    }
  }
  stage.add(layer);
  layer.draw();
  const url = layer.toDataURL({ pixelRatio: 1, mimeType: "image/png" });
  stage.destroy();
  container.remove();
  return url;
}
