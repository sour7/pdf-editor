/**
 * Sample RGBA from a canvas at (x, y) in canvas pixel coordinates.
 */
export function sampleCanvasColor(
  canvas: HTMLCanvasElement,
  x: number,
  y: number
): string {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "#000000";
  const ix = Math.max(0, Math.min(canvas.width - 1, Math.floor(x)));
  const iy = Math.max(0, Math.min(canvas.height - 1, Math.floor(y)));
  const d = ctx.getImageData(ix, iy, 1, 1).data;
  return rgbaToHex(d[0], d[1], d[2], d[3] / 255);
}

function rgbaToHex(r: number, g: number, b: number, a: number): string {
  if (a < 0.99) {
    return `rgba(${r},${g},${b},${a.toFixed(3)})`;
  }
  return (
    "#" +
    [r, g, b]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Average color in a small window (for cover tool auto-fill).
 */
export function sampleAverageAround(
  canvas: HTMLCanvasElement,
  cx: number,
  cy: number,
  radius = 4
): string {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "#ffffff";
  const x0 = Math.max(0, Math.floor(cx - radius));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const x1 = Math.min(canvas.width, Math.ceil(cx + radius + 1));
  const y1 = Math.min(canvas.height, Math.ceil(cy + radius + 1));
  const w = x1 - x0;
  const h = y1 - y0;
  if (w <= 0 || h <= 0) return "#ffffff";
  const img = ctx.getImageData(x0, y0, w, h).data;
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (let i = 0; i < img.length; i += 4) {
    r += img[i];
    g += img[i + 1];
    b += img[i + 2];
    n++;
  }
  if (n === 0) return "#ffffff";
  r = Math.round(r / n);
  g = Math.round(g / n);
  b = Math.round(b / n);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
