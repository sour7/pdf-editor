import { useEditorStore } from "@/stores/editorStore";
import type { ToolMode } from "@/types/editor";
import styles from "./ToolDock.module.css";

const TOOLS: { id: ToolMode; label: string; hint: string }[] = [
  { id: "select", label: "Select", hint: "V — move & resize" },
  { id: "text", label: "Text", hint: "Click page to place" },
  { id: "cover", label: "Cover", hint: "Drag to hide text" },
  { id: "eyedropper", label: "Pick", hint: "Sample from page" },
];

export function ToolDock() {
  const toolMode = useEditorStore((s) => s.toolMode);
  const setToolMode = useEditorStore((s) => s.setToolMode);

  return (
    <nav className={styles.dock} aria-label="Tools">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          type="button"
          title={t.hint}
          className={`${styles.btn} ${toolMode === t.id ? styles.btnActive : ""}`}
          onClick={() => setToolMode(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
