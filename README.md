# Flattened PDF Editor

Browser-based editor for **scanned / image-only PDFs**. Original pixels stay intact; all edits are **vector overlays** (Konva) merged at export time so output matches the preview.

## Stack

- **React 18 + TypeScript + Vite**
- **pdf.js** — high-DPI rasterization per page
- **Konva + react-konva** — text boxes, cover rectangles, transform handles, guides
- **Zustand** — document / tool / per-page overlay JSON / undo stacks
- **pdf-lib** — client-side multi-page PDF rebuild from merged rasters
- **Express** (optional) — `POST /api/merge-pdf` for server-side merge automation

## Project structure

```
├── src/
│   ├── App.tsx                 # Shell layout
│   ├── components/             # TopBar, ToolDock, EditorStage, KonvaOverlay, panels
│   ├── constants/fonts.ts      # System + Google Fonts helpers
│   ├── lib/
│   │   ├── pdfRender.ts        # pdf.js page → canvas
│   │   ├── konvaSnapshot.ts    # Off-screen Konva → PNG (export)
│   │   ├── mergeExport.ts      # Composite PDF + overlay
│   │   ├── exportPdf.ts        # Full PDF / single-page PNG / JPEG
│   │   └── sampleColor.ts      # Eyedropper + average color for covers
│   ├── stores/editorStore.ts
│   └── types/editor.ts         # Overlay JSON schema (shapes)
├── server/index.ts             # Optional API
├── index.html
├── vite.config.ts
└── package.json
```

## Setup

```bash
npm install
npm run dev:client
```

Open **http://localhost:5173** — Vite proxies `/api/*` to the optional backend.

### Optional API (merge / future uploads)

```bash
npm run dev:server
```

Runs **http://localhost:3847** (`GET /api/health`, `POST /api/merge-pdf`).

### Both client + server

```bash
npm run dev
```

### Production build (static client)

```bash
npm run build
npm run preview
```

### Compile server only

```bash
npx tsc -p server/tsconfig.json
node dist-server/index.js
```

## Usage

1. **Open PDF** — each page is rasterized at the chosen **render scale** (1–4×) for sharp editing.
2. **Text** — click the page to place; edit in the right **Properties** panel (fonts include on-demand **Google Fonts**).
3. **Cover** — drag a rectangle; pick fill with **Pick** (eyedropper) or click the page while Cover is active to average nearby pixels.
4. **Grid / smart guides** — toggles in the right panel; grid snaps on **release** after drag.
5. **Layers** — reorder, lock, bring forward / send backward.
6. **Export** — **Export PDF** rebuilds all pages from merged rasters; **PNG** / **JPG** export the **current** page.
7. **Save project** — downloads overlay JSON. **Load project** restores overlays; **re-upload the same PDF** to continue (PDF bytes are not stored in the JSON).

## Keyboard shortcuts

| Shortcut        | Action        |
|----------------|---------------|
| `Ctrl/Cmd+Z`   | Undo          |
| `Ctrl/Cmd+Shift+Z` / `Ctrl+Y` | Redo |
| `Delete`       | Delete shape  |
| `Ctrl/Cmd+D`   | Duplicate     |
| Arrows         | Nudge (Shift = 10px) |

## Implementation notes

- **Undo** stores per-page overlay JSON snapshots (last 50 steps).
- **Export** re-reenders each pdf.js page and Konva overlay off-screen so multi-page output does not depend on the visible canvas.
- **Bonus ideas** (not implemented): Tesseract text boxes, true inpainting, real-time collaboration — hooks are straightforward on top of the overlay model.

## Constraints

- Large PDFs at **high render scale** are memory-heavy; lower scale or split files if needed.
- **Multer 1.x** is deprecated; upgrade to v2 when you harden the API for production.
