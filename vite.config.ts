import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [dts({ insertTypesEntry: true, outDir: "lib" })],
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "rimless",
      fileName: (format) => (format === "iife" ? "rimless.min.js" : "rimless.js"),
      formats: ["es", "iife"],
    },
    rollupOptions: {
      external: [],
      output: {
        dir: "lib",
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  optimizeDeps: {
    exclude: ['./docs/examples/iframe.html']
  }
});
