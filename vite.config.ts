import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Tauri convention: keep the CLI output visible alongside `tauri dev`.
  clearScreen: false,
  server: {
    // Tauri expects a fixed dev server port.
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    // Tauri on Windows ships a modern WebView2 (Chromium) runtime.
    target: "es2021",
  },
});
