import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  base: "./",
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    // Cargo writes build artifacts under src-tauri; watching them crashes Vite on Windows (EBUSY).
    watch: { ignored: ["**/src-tauri/**"] },
  },
});
