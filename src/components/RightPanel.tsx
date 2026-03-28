import { useCallback, useMemo } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { parseOverlayJson, stringifyOverlay } from "@/types/editor";
import type { EditorShape } from "@/types/editor";
import { PropertiesPanel } from "./PropertiesPanel";
import { LayersPanel } from "./LayersPanel";
import styles from "./RightPanel.module.css";

export function RightPanel() {
  const currentPage = useEditorStore((s) => s.currentPage);
  const pageCount = useEditorStore((s) => s.pageCount);
  const setCurrentPage = useEditorStore((s) => s.setCurrentPage);
  const raw = useEditorStore((s) => s.overlays[currentPage] ?? null);
  const setOverlayJson = useEditorStore((s) => s.setOverlayJson);
  const showGrid = useEditorStore((s) => s.showGrid);
  const toggleGrid = useEditorStore((s) => s.toggleGrid);
  const snapGrid = useEditorStore((s) => s.snapGrid);
  const toggleSnapGrid = useEditorStore((s) => s.toggleSnapGrid);
  const snapGuides = useEditorStore((s) => s.snapGuides);
  const toggleSnapGuides = useEditorStore((s) => s.toggleSnapGuides);
  const gridSize = useEditorStore((s) => s.gridSize);
  const setGridSize = useEditorStore((s) => s.setGridSize);
  const lastPickedColor = useEditorStore((s) => s.lastPickedColor);

  const shapes = useMemo(() => parseOverlayJson(raw).shapes, [raw]);

  const commit = useCallback(
    (next: EditorShape[]) => {
      setOverlayJson(currentPage, stringifyOverlay({ v: 1, shapes: next }));
    },
    [currentPage, setOverlayJson]
  );

  const onToggleLock = (id: string) => {
    commit(
      shapes.map((s) =>
        s.id === id ? { ...s, locked: !s.locked } : s
      )
    );
  };

  return (
    <aside className={styles.aside}>
      <div className={styles.pageNav}>
        <button
          type="button"
          className={styles.pageBtn}
          disabled={currentPage <= 0}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          ← Prev
        </button>
        <span className={styles.pageInfo}>
          Page {pageCount ? currentPage + 1 : 0} / {pageCount}
        </span>
        <button
          type="button"
          className={styles.pageBtn}
          disabled={currentPage >= pageCount - 1}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Next →
        </button>
      </div>

      <section className={styles.section}>
        <h3 className={styles.h}>Precision</h3>
        <label className={styles.toggle}>
          <input type="checkbox" checked={showGrid} onChange={() => toggleGrid()} />
          Show grid
        </label>
        <label className={styles.toggle}>
          <input type="checkbox" checked={snapGrid} onChange={() => toggleSnapGrid()} />
          Snap to grid (on release)
        </label>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={snapGuides}
            onChange={() => toggleSnapGuides()}
          />
          Smart guides
        </label>
        <label className={styles.sub}>
          Grid size ({gridSize}px)
          <input
            type="range"
            min={4}
            max={32}
            value={gridSize}
            onChange={(e) => setGridSize(Number(e.target.value))}
          />
        </label>
        <p className={styles.swatch}>
          <span className={styles.swatchDot} style={{ background: lastPickedColor }} />
          Last color: <code>{lastPickedColor}</code>
        </p>
      </section>

      <PropertiesPanel shapes={shapes} onUpdateShape={commit} />
      <LayersPanel
        shapes={shapes}
        onReorder={commit}
        onToggleLock={onToggleLock}
      />

      <section className={styles.section}>
        <h3 className={styles.h}>Shortcuts</h3>
        <ul className={styles.kbd}>
          <li>
            <kbd>Ctrl+Z</kbd> undo · <kbd>Ctrl+Shift+Z</kbd> redo
          </li>
          <li>
            <kbd>Delete</kbd> remove · <kbd>Ctrl+D</kbd> duplicate
          </li>
          <li>
            <kbd>Arrows</kbd> nudge (hold Shift for 10px)
          </li>
        </ul>
      </section>
    </aside>
  );
}
