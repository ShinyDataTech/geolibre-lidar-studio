import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: ["geolibre-wasm", "@bjorn3/browser_wasi_shim"],
  },
  server: {
    port: 5180,
    strictPort: false,
    headers: {
      // Cross-origin isolation for fast SharedArrayBuffer / WASM memory if needed
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
