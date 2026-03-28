import { HexColorPicker } from "react-colorful";
import { useEditorStore } from "@/stores/editorStore";
import type { CoverShape, EditorShape, TextShape } from "@/types/editor";
import { GOOGLE_FONTS, SYSTEM_FONTS, loadGoogleFont } from "@/constants/fonts";
import styles from "./SidePanel.module.css";

function joinFontStyle(bold: boolean, italic: boolean) {
  if (bold && italic) return "bold italic";
  if (bold) return "bold";
  if (italic) return "italic";
  return "normal";
}

/** react-colorful Hex picker only accepts #rrggbb */
function pickerHex(s: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s : fallback;
}

interface PropertiesPanelProps {
  shapes: EditorShape[];
  onUpdateShape: (next: EditorShape[]) => void;
}

export function PropertiesPanel({ shapes, onUpdateShape }: PropertiesPanelProps) {
  const selectedId = useEditorStore((s) => s.selectedShapeId);
  const markFontLoaded = useEditorStore((s) => s.markFontLoaded);
  const shape = shapes.find((s) => s.id === selectedId);

  if (!shape) {
    return (
      <section className={styles.section}>
        <h3 className={styles.h}>Properties</h3>
        <p className={styles.muted}>Select a text box or cover rectangle.</p>
      </section>
    );
  }

  const replace = (patch: Partial<TextShape> | Partial<CoverShape>) => {
    onUpdateShape(
      shapes.map((s) => (s.id === shape.id ? ({ ...s, ...patch } as EditorShape) : s))
    );
  };

  if (shape.type === "text") {
    const t = shape;
    const onFont = (family: string) => {
      const id = `gf-link-${family.replace(/\s+/g, "-")}`;
      loadGoogleFont(family, id);
      markFontLoaded(family);
      replace({ fontFamily: family });
    };
    return (
      <section className={styles.section}>
        <h3 className={styles.h}>Text</h3>
        <label className={styles.label}>Content</label>
        <textarea
          className={styles.textarea}
          rows={4}
          value={t.text}
          onChange={(e) => replace({ text: e.target.value })}
        />
        <label className={styles.label}>Font</label>
        <select
          className={styles.select}
          value={t.fontFamily}
          onChange={(e) => onFont(e.target.value)}
        >
          <optgroup label="System / local">
            {SYSTEM_FONTS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </optgroup>
          <optgroup label="Google Fonts">
            {GOOGLE_FONTS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </optgroup>
        </select>
        <label className={styles.label}>Size ({Math.round(t.fontSize)}px)</label>
        <input
          type="range"
          min={6}
          max={200}
          value={t.fontSize}
          onChange={(e) => replace({ fontSize: Number(e.target.value) })}
          className={styles.range}
        />
        <label className={styles.label}>Weight / style</label>
        <div className={styles.row}>
          <button
            type="button"
            className={`${styles.chip} ${/\bbold\b/i.test(t.fontStyle) ? styles.chipOn : ""}`}
            onClick={() => {
              const bold = !/\bbold\b/i.test(t.fontStyle);
              const italic = /\bitalic\b/i.test(t.fontStyle);
              replace({
                fontStyle: joinFontStyle(bold, italic),
              });
            }}
          >
            Bold
          </button>
          <button
            type="button"
            className={`${styles.chip} ${/\bitalic\b/i.test(t.fontStyle) ? styles.chipOn : ""}`}
            onClick={() => {
              const bold = /\bbold\b/i.test(t.fontStyle);
              const italic = !/\bitalic\b/i.test(t.fontStyle);
              replace({
                fontStyle: joinFontStyle(bold, italic),
              });
            }}
          >
            Italic
          </button>
        </div>
        <label className={styles.label}>Letter spacing</label>
        <input
          type="range"
          min={-5}
          max={40}
          step={0.5}
          value={t.letterSpacing}
          onChange={(e) => replace({ letterSpacing: Number(e.target.value) })}
          className={styles.range}
        />
        <label className={styles.label}>Line height</label>
        <input
          type="range"
          min={0.8}
          max={3}
          step={0.05}
          value={t.lineHeight}
          onChange={(e) => replace({ lineHeight: Number(e.target.value) })}
          className={styles.range}
        />
        <label className={styles.label}>Align</label>
        <div className={styles.row}>
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              type="button"
              className={`${styles.chip} ${t.align === a ? styles.chipOn : ""}`}
              onClick={() => replace({ align: a })}
            >
              {a}
            </button>
          ))}
        </div>
        <label className={styles.label}>Color</label>
        <HexColorPicker
          color={pickerHex(t.fill, "#333333")}
          onChange={(c) => replace({ fill: c })}
          style={{ width: "100%", height: 140 }}
        />
        <p className={styles.hint}>
          Match scan text visually: adjust size, spacing, and color against the page
          background.
        </p>
      </section>
    );
  }

  const c = shape;
  return (
    <section className={styles.section}>
      <h3 className={styles.h}>Cover</h3>
      <p className={styles.muted}>
        Hides underlying pixels. Use the eyedropper or click the page while the cover
        tool is active to sample background color.
      </p>
      <label className={styles.label}>Fill</label>
      <HexColorPicker
        color={pickerHex(c.fill, "#ffffff")}
        onChange={(hex) => replace({ fill: hex })}
        style={{ width: "100%", height: 140 }}
      />
      <label className={styles.label}>Opacity ({c.opacity.toFixed(2)})</label>
      <input
        type="range"
        min={0.2}
        max={1}
        step={0.02}
        value={c.opacity}
        onChange={(e) => replace({ opacity: Number(e.target.value) })}
        className={styles.range}
      />
    </section>
  );
}
