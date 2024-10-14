import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [dts()],
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "rimless",
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: ["lodash.get", "lodash.set", "nanoid"],
      output: {},
    },
    sourcemap: true,
    emptyOutDir: true,
  },
});
