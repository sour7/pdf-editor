import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/** Set `VITE_BASE=/your-repo/` when hosting on GitHub Pages project sites. */
const base = process.env.VITE_BASE?.replace(/\/?$/, "/") || "/";

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:3847", changeOrigin: true },
    },
  },
  optimizeDeps: {
    include: ["pdfjs-dist", "konva", "react-konva"],
  },
});
