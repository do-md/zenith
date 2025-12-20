import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*'],
      exclude: ['src/**/*.test.ts'],
      entryRoot: 'src',
    }),
  ],
  build: {
    sourcemap: true,
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'middleware/index': resolve(__dirname, 'src/middleware/index.ts'),
      },
      name: 'ReactDomdStore',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['react', 'immer'],
      output: {
        globals: {
          react: 'React',
          immer: 'immer',
        },
      },
    },
    sourcemap: false,
    minify: 'esbuild',
  },
});

