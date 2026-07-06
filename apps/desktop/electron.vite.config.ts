import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

// Bundle the workspace core (its package "exports" point at TypeScript source),
// while keeping node built-ins and third-party deps external.
const bundleCore = externalizeDepsPlugin({ exclude: ["@mtg-coach/core"] });

export default defineConfig({
  main: {
    plugins: [bundleCore],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, "src/main/index.ts") }
      }
    }
  },
  preload: {
    plugins: [bundleCore],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, "src/preload/index.ts") }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, "src/renderer"),
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, "src/renderer/index.html") }
      }
    },
    plugins: [react()]
  }
});
