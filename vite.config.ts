import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      include: ["src/**/*"],
      exclude: ["src/**/*.test.ts"],
      entryRoot: "src",
    }),
  ],

  // Configure esbuild to handle JSX and avoid React internal runtime APIs
  esbuild: {
    jsx: "transform", // Use classic transformation mode
    jsxFactory: "createElement", // Specify JSX factory function
    jsxFragment: "Fragment", // Specify Fragment
  },

  build: {
    sourcemap: false,
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        "middleware/index": resolve(__dirname, "src/middleware/index.ts"),
      },
      name: "ReactDomdStore",
      formats: ["es", "cjs"],
      fileName: (format, entryName) =>
        `${entryName}.${format === "es" ? "mjs" : "cjs"}`,
    },
    rollupOptions: {
      external: ["react", "immer"],
      output: {
        globals: {
          react: "React",
          immer: "immer",
        },
      },
    },
    minify: "esbuild",
  },
});
