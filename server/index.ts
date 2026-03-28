/**
 * Optional Express service for large PDF merges or future auth/storage.
 * Client exports run fully in-browser; this endpoint mirrors merge for automation.
 */
import express from "express";
import cors from "cors";
import multer from "multer";
import { PDFDocument } from "pdf-lib";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 },
});

const app = express();
const PORT = process.env.PORT ?? 3847;

app.use(cors({ origin: true }));
app.use(express.json({ limit: "80mb" }));

/** Health check */
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "pdf-editor-api" });
});

/**
 * POST /api/merge-pdf
 * multipart: file = original PDF, body.overlayPages = JSON map pageIndex -> data URL PNG (merged raster per page).
 * Returns application/pdf bytes.
 *
 * For most users the in-browser pdf-lib path is enough; use this when you add server-side queues.
 */
app.post(
  "/api/merge-pdf",
  upload.single("file"),
  async (req, res) => {
    try {
      const buf = req.file?.buffer;
      if (!buf) {
        res.status(400).json({ error: "Missing PDF file field `file`" });
        return;
      }
      const raw = req.body?.overlayPages as string | undefined;
      if (!raw) {
        res.status(400).json({ error: "Missing overlayPages JSON" });
        return;
      }
      const overlayPages = JSON.parse(raw) as Record<string, string>;
      const src = await PDFDocument.load(buf);
      const pages = src.getPages();
      const out = await PDFDocument.create();

      for (let i = 0; i < pages.length; i++) {
        const dataUrl = overlayPages[String(i)];
        if (!dataUrl || !dataUrl.startsWith("data:image/png")) {
          res.status(400).json({ error: `Missing PNG data URL for page ${i}` });
          return;
        }
        const b64 = dataUrl.split(",")[1];
        const bytes = Buffer.from(b64, "base64");
        const { width, height } = pages[i].getSize();
        const page = out.addPage([width, height]);
        const png = await out.embedPng(bytes);
        page.drawImage(png, { x: 0, y: 0, width, height });
      }

      const pdfBytes = await out.save();
      res.setHeader("Content-Type", "application/pdf");
      res.send(Buffer.from(pdfBytes));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Merge failed" });
    }
  }
);

app.listen(PORT, () => {
  console.log(`PDF editor API http://localhost:${PORT}`);
});
