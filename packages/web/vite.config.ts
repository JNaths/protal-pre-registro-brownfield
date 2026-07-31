import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Plan 03-06 is the first plan to issue a real browser -> API fetch
    // (POST /api/pre-registros) from the wizard. Without this proxy, `fetch("/api/...")`
    // from the Vite dev server (5173) would hit Vite itself instead of @app/api (3000).
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
