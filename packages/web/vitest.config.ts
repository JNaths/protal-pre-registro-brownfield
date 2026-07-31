import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    passWithNoTests: true,
    // Full-suite runs execute many CPU-bound multi-step wizard fills (5-step forms +
    // Radix Select interactions) concurrently across files, which can push individual
    // tests past the 5000ms default under contention even though they pass quickly in
    // isolation. Raised to accommodate full `npm test` runs without flaking.
    testTimeout: 15000,
  },
});
