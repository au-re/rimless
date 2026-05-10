import path from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [dts({ insertTypesEntry: true, include: ["src"], entryRoot: "src" })],
  build: {
    outDir: "lib",
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "rimless",
      fileName: (format) => (format === "iife" ? "rimless.min.js" : "rimless.js"),
      formats: ["es", "iife"],
    },
    rollupOptions: {
      external: [],
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  optimizeDeps: {
    exclude: ["./docs/examples/iframe.html"],
  },
});
