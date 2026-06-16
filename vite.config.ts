import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Change `base` if you fork this under a different GitHub repo name.
// Served at https://<user>.github.io/Transcriber/
const BASE = '/Transcriber/';

// Cross-origin isolation enables SharedArrayBuffer -> multithreaded WASM in dev.
// GitHub Pages cannot send these headers; the app falls back to single-threaded
// WASM (or WebGPU) there. See README.
const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    // Self-host the onnxruntime-web WASM binaries that ship inside
    // @huggingface/transformers so the app works offline after the first model
    // download and does not depend on a CDN. Served at <base>/ in dev and prod.
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@huggingface/transformers/dist/*.wasm',
          dest: '',
        },
      ],
    }),
  ],
  server: {
    headers: crossOriginIsolation,
  },
  preview: {
    headers: crossOriginIsolation,
  },
  worker: {
    format: 'es',
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
