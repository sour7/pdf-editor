import { TopBar } from "./components/TopBar";
import { ToolDock } from "./components/ToolDock";
import { EditorStage } from "./components/EditorStage";
import { RightPanel } from "./components/RightPanel";
import styles from "./App.module.css";

export default function App() {
  return (
    <div className={styles.app}>
      <TopBar />
      <div className={styles.body}>
        <ToolDock />
        <main className={styles.main}>
          <EditorStage />
        </main>
        <RightPanel />
      </div>
    </div>
  );
}
