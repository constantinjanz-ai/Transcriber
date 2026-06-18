import {
  pipeline,
  env,
  Tensor,
  type AutomaticSpeechRecognitionPipeline,
} from '@huggingface/transformers';
import type { WorkerRequest, WorkerResponse, LoadProgress } from './protocol';
import type { WhisperWord } from './tokens';
import { pickLanguageFromLogits } from './language';

// Fetch models from the Hugging Face hub (no bundled local models)...
env.allowLocalModels = false;
// ...but load the ONNX Runtime WASM binaries from our own origin (self-hosted by
// vite-plugin-static-copy), so the app works offline after the first run and on
// GitHub Pages without a CDN dependency.
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.wasmPaths = import.meta.env.BASE_URL;
  // Use multiple WASM threads when the page is cross-origin isolated
  // (SharedArrayBuffer available — set via COOP/COEP headers in dev and on Vercel).
  // Falls back to single-threaded everywhere else.
  const isolated =
    typeof self !== 'undefined' &&
    (self as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated === true;
  env.backends.onnx.wasm.numThreads = isolated
    ? Math.min(navigator.hardwareConcurrency || 4, 8)
    : 1;
}

// Minimal typed view of the dedicated worker global scope. Declaring it locally
// avoids pulling in the WebWorker lib globally (which conflicts with the DOM lib).
interface WorkerScope {
  postMessage(message: WorkerResponse, transfer?: Transferable[]): void;
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<WorkerRequest>) => void,
  ): void;
}
const ctx = self as unknown as WorkerScope;

// `pipeline` is heavily overloaded; cast to a single signature so passing a
// plain options object doesn't blow up overload resolution into a huge union.
const createPipeline = pipeline as unknown as (
  task: 'automatic-speech-recognition',
  model: string,
  options: Record<string, unknown>,
) => Promise<AutomaticSpeechRecognitionPipeline>;

type Transcribe = (
  audio: Float32Array,
  options: Record<string, unknown>,
) => Promise<{ text?: string; chunks?: WhisperWord[] }>;

/** Minimal view of the Whisper pipeline internals used for language detection. */
interface WhisperInternals {
  processor: (audio: Float32Array) => Promise<{ input_features: unknown }>;
  model: ((inputs: {
    input_features: unknown;
    decoder_input_ids: Tensor;
  }) => Promise<{ logits: { data: ArrayLike<number> } }>) & {
    generation_config: {
      decoder_start_token_id: number;
      lang_to_id: Record<string, number>;
    };
  };
}

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let loadedKey: string | null = null;

const post = (msg: WorkerResponse) => ctx.postMessage(msg);

async function handleLoad(req: Extract<WorkerRequest, { type: 'load' }>): Promise<void> {
  const key = `${req.modelId}|${req.engine}|${JSON.stringify(req.dtype)}`;
  if (transcriber && loadedKey === key) {
    post({ id: req.id, type: 'loaded' });
    return;
  }
  if (transcriber) {
    await (transcriber as { dispose?: () => Promise<void> }).dispose?.();
    transcriber = null;
    loadedKey = null;
  }

  const options = {
    device: req.engine,
    dtype: req.dtype,
    progress_callback: (progress: LoadProgress) => {
      post({ id: req.id, type: 'progress', progress });
    },
  };

  transcriber = await createPipeline(
    'automatic-speech-recognition',
    req.modelId,
    options,
  );

  loadedKey = key;
  post({ id: req.id, type: 'loaded' });
}

async function handleTranscribe(
  req: Extract<WorkerRequest, { type: 'transcribe' }>,
): Promise<void> {
  if (!transcriber) throw new Error('Model is not loaded.');

  const options: Record<string, unknown> = { return_timestamps: 'word' };
  if (req.multilingual) {
    options.task = 'transcribe';
    if (req.language) options.language = req.language;
  }

  const transcribe = transcriber as unknown as Transcribe;
  const output = await transcribe(req.samples, options);

  post({
    id: req.id,
    type: 'transcribed',
    words: output.chunks ?? [],
    text: output.text ?? '',
  });
}

async function handleDetect(
  req: Extract<WorkerRequest, { type: 'detect' }>,
): Promise<void> {
  if (!transcriber) throw new Error('Model is not loaded.');
  const { processor, model } = transcriber as unknown as WhisperInternals;

  // Whisper detects language from the token emitted right after
  // <|startoftranscript|>: run a single decode step and read those logits.
  const { input_features } = await processor(req.samples);
  const startId = model.generation_config.decoder_start_token_id;
  const decoder_input_ids = new Tensor(
    'int64',
    new BigInt64Array([BigInt(startId)]),
    [1, 1],
  );
  const { logits } = await model({ input_features, decoder_input_ids });
  const language = pickLanguageFromLogits(
    logits.data,
    model.generation_config.lang_to_id,
  );

  post({ id: req.id, type: 'detected', language });
}

function dispatch(req: WorkerRequest): Promise<void> {
  switch (req.type) {
    case 'load':
      return handleLoad(req);
    case 'transcribe':
      return handleTranscribe(req);
    case 'detect':
      return handleDetect(req);
  }
}

ctx.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  const run = dispatch(req);
  run.catch((err: unknown) => {
    post({
      id: req.id,
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
  });
});
