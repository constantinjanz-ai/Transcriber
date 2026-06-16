import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Base path differs by host:
//  - Vercel serves at the domain root            -> '/'
//  - GitHub Pages serves under the repo sub-path  -> '/Transcriber/'
// Vercel sets VERCEL=1 during the build, so we switch automatically. Change the
// Pages fallback if you fork this under a different repo name.
const BASE = process.env.VERCEL ? '/' : '/Transcriber/';

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
          // Both the .wasm binary AND its .mjs loader are required — ONNX Runtime
          // dynamically imports the .mjs, which then fetches the .wasm.
          src: 'node_modules/@huggingface/transformers/dist/ort-*.{mjs,wasm}',
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
