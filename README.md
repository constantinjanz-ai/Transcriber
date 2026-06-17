# Webinar Transcriber

A small, **fully local** speech-to-text tool that turns an audio or video recording
into a `transcript.json` with **word-level timestamps**. It runs entirely in your
browser — **nothing is uploaded**. The only network request is a one-time download of
the Whisper model from Hugging Face, which is then cached; after that the tool works
offline.

It exists to feed a separate video pipeline that cuts long webinars into vertical
YouTube Shorts: that pipeline needs to know not just *what* was said but *when*, to
the word. This tool produces exactly that file.

---

## Quick start

> **Prerequisite:** Node.js **20+** and npm. (If `node -v` fails, install Node first —
> e.g. from [nodejs.org](https://nodejs.org) or via `nvm`.)

```bash
npm install      # installs deps and creates package-lock.json (commit it — CI needs it)
npm run dev      # serves the app at http://localhost:5173/Transcriber/
```

Then:

1. Drag in (or click to choose) an audio/video file: `.mp4 .mov .m4a .mp3 .wav .webm`.
2. Pick an engine (auto-detected), model size, and language mode.
3. Click **Transcribe**. Watch model-download and per-chunk progress.
4. Click **Download transcript.json** (and optionally `.txt` plain text, or `.srt` / `.vtt` subtitles).

Other scripts:

```bash
npm test         # unit tests (Vitest)
npm run lint     # eslint + prettier --check
npm run build    # type-check + production build into dist/
npm run preview  # preview the production build locally
```

---

## How to use

- **Engine** — **WebGPU** is used automatically when available (recent Chrome/Edge),
  otherwise **WASM** (CPU) everywhere. You can switch manually; if WebGPU fails to
  initialize, switch to WASM and try again.
- **Model size** — `tiny` / `base` / `small`. Larger is more accurate but slower and a
  bigger download.
- **Language mode** —
  - **Multilingual** (default): auto-detects the language, or pick one manually
    (English, German, and more). Use this for Peec's German webinars.
  - **English-optimized** (`.en`): faster/more accurate for English-only audio.
- **Default**: multilingual `base` with auto-detect.

---

## The output contract (frozen)

`transcript.json` is a JSON **array** of word-level tokens (the `@remotion/captions`
`Caption` shape). Treat this format as frozen — the downstream pipeline depends on it.

```json
[
  { "text": " You", "startMs": 500, "endMs": 760, "timestampMs": 630, "confidence": null },
  { "text": " can't", "startMs": 760, "endMs": 1020, "timestampMs": 890, "confidence": null }
]
```

| Field         | Type                | Notes                                                        |
| ------------- | ------------------- | ------------------------------------------------------------ |
| `text`        | string              | One token as Whisper emits it. **Leading space is kept.**    |
| `startMs`     | integer             | Absolute ms from start of media.                             |
| `endMs`       | integer             | Absolute ms; always `>= startMs`.                            |
| `timestampMs` | integer \| null     | Midpoint of start/end, or `null` if unknown.                 |
| `confidence`  | number (0–1) \| null| `null` — Whisper does not provide per-word confidence here.  |

Tokens are in chronological order across the whole file (offsets are **global**, not
per-chunk).

- **Schema:** [`schema/transcript.schema.json`](schema/transcript.schema.json) (JSON
  Schema, draft 2020-12).
- **Example:** [`sample/transcript.example.json`](sample/transcript.example.json).
- **Validator:** [`src/schema/validate.ts`](src/schema/validate.ts) — also enforces
  `endMs >= startMs` and chronological order, which the schema language can't express.
  Every exported file is validated in-app before download; the UI shows a pass/fail
  badge.

---

## How it works

1. **Decode + resample** ([`src/audio/decode.ts`](src/audio/decode.ts)) — the file is
   decoded with the Web Audio API and rendered to **mono 16 kHz** via an
   `OfflineAudioContext`.
2. **Chunk** ([`src/audio/chunk.ts`](src/audio/chunk.ts)) — the audio is split into
   non-overlapping **~30 s** windows so hour-long files don't blow up memory and
   progress is visible.
3. **Transcribe** ([`src/asr/whisper.worker.ts`](src/asr/whisper.worker.ts)) — Whisper
   runs in a **Web Worker** (so the UI stays responsive) with
   `return_timestamps: 'word'`. Each window is processed in turn and freed.
4. **Map to the contract** ([`src/asr/tokens.ts`](src/asr/tokens.ts)) — word
   timestamps are offset onto a **global** timeline; a missing end time falls back to
   the next word's start, then the chunk end.

### Engine / model

- ASR engine: [`@huggingface/transformers`](https://www.npmjs.com/package/@huggingface/transformers)
  (transformers.js), **pinned to `3.8.1`** (exact, no caret — see `package.json`).
- Models: `onnx-community/whisper-{tiny,base,small}` and the `.en` variants.

---

## Privacy

Your audio never leaves the browser tab — it is decoded and transcribed locally. The
only outbound request is the **one-time model download** from the Hugging Face CDN,
which the browser caches. After the first run the app works **fully offline**. There is
no backend, no telemetry, and nothing is stored on a server.

---

## Browser support

- **WebGPU** (fastest) needs a recent **Chrome or Edge** (and a supported GPU). Safari
  and Firefox support is still maturing.
- **WASM** (CPU) is the fallback and works in all modern browsers — slower, especially
  for larger models.
- The onnxruntime-web WASM binaries are **self-hosted** (copied into the build), so the
  app does not depend on a CDN at runtime and works offline.

### A note on speed (WASM threads)

Multithreaded WASM needs cross-origin isolation (`COOP`/`COEP` headers → `SharedArrayBuffer`).
The dev server sets these automatically. The deployed app currently runs single-threaded
WASM, which is reliable everywhere. Vercel _can_ send these headers (via a `vercel.json`)
to unlock multithreaded WASM — left off by default because `COEP: require-corp` needs care
so it doesn't block the cross-origin Hugging Face model download.

---

## Troubleshooting

| Symptom                                   | Fix                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------- |
| "WebGPU failed to initialize"             | Switch the **Engine** toggle to **WASM** and transcribe again.      |
| "Could not decode this file"              | Export the audio as **WAV** or **MP3** and upload that.             |
| "Unsupported file type"                   | Use `.mp4 .mov .m4a .mp3 .wav .webm`.                               |
| Very slow on WASM                         | Use a smaller model (`tiny`/`base`), or a WebGPU-capable browser.   |
| First run is slow / shows a big download  | That's the one-time model download; it's cached for next time.      |

---

## Deployment (Vercel)

The app is hosted on **Vercel**, connected to this repo's Git integration, so every
push to `main` builds and deploys automatically.

- **Live app:** https://transcriber-seven-sandy.vercel.app/
- PRs run [`.github/workflows/ci.yml`](.github/workflows/ci.yml): lint, tests, and a
  build. **Commit `package-lock.json`** (created by `npm install`) — CI uses `npm ci`,
  which requires it.
- Base path is host-aware in `vite.config.ts`: Vercel serves at the root (`/`); the
  fallback (`/Transcriber/`) is for serving under a GitHub Pages-style sub-path. Vercel
  sets `VERCEL=1` during the build, so the right base is chosen automatically.

---

## Project structure

```
schema/transcript.schema.json   frozen contract (JSON Schema)
sample/transcript.example.json  valid example output
src/
  audio/      decode (browser) · resample (pure) · chunk (pure)
  asr/        worker · client · device select · model registry · token mapping (pure)
  export/     json · txt · srt · vtt
  schema/     types · ajv validator
  ui/         React components
  transcribe.ts   end-to-end orchestration
tests/        resample · chunk · tokens · schema (Vitest, node)
```

---

## Out of scope (possible follow-ups)

- A Node CLI (`npx <tool> input.mp4 -o transcript.json`) reusing the pure
  token-mapping/schema code to emit the identical contract.
- Overlapping-chunk merge/dedup for cleaner word boundaries.
- Batch mode (multiple files).
