import { useEditorStore } from "@/stores/editorStore";
import type { EditorShape } from "@/types/editor";
import styles from "./SidePanel.module.css";

interface LayersPanelProps {
  shapes: EditorShape[];
  onReorder: (next: EditorShape[]) => void;
  onToggleLock: (id: string) => void;
}

export function LayersPanel({
  shapes,
  onReorder,
  onToggleLock,
}: LayersPanelProps) {
  const selectedId = useEditorStore((s) => s.selectedShapeId);
  const setSelectedId = useEditorStore((s) => s.setSelectedShapeId);

  const rev = [...shapes].reverse();

  const bringForward = (id: string) => {
    const i = shapes.findIndex((s) => s.id === id);
    if (i < 0 || i >= shapes.length - 1) return;
    const next = [...shapes];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    onReorder(next);
  };

  const sendBackward = (id: string) => {
    const i = shapes.findIndex((s) => s.id === id);
    if (i <= 0) return;
    const next = [...shapes];
    [next[i], next[i - 1]] = [next[i - 1], next[i]];
    onReorder(next);
  };

  return (
    <section className={styles.section}>
      <h3 className={styles.h}>Layers</h3>
      <p className={styles.muted}>Top of list = drawn on top (Konva order).</p>
      <ul className={styles.layerList}>
        {rev.map((s) => (
          <li
            key={s.id}
            className={`${styles.layerRow} ${selectedId === s.id ? styles.layerRowActive : ""}`}
          >
            <button
              type="button"
              className={styles.layerName}
              onClick={() => setSelectedId(s.id)}
            >
              {s.type === "text"
                ? `Text: ${s.text.slice(0, 28)}${s.text.length > 28 ? "…" : ""}`
                : "Cover"}
            </button>
            <div className={styles.layerActions}>
              <button
                type="button"
                className={styles.iconBtn}
                title="Lock"
                onClick={() => onToggleLock(s.id)}
              >
                {s.locked ? "🔒" : "🔓"}
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                title="Bring forward"
                onClick={() => bringForward(s.id)}
              >
                ↑
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                title="Send backward"
                onClick={() => sendBackward(s.id)}
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ul>
      {shapes.length === 0 && (
        <p className={styles.muted}>No overlay objects yet.</p>
      )}
    </section>
  );
}
