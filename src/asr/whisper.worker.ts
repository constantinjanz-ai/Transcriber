import {
  pipeline,
  env,
  type AutomaticSpeechRecognitionPipeline,
} from '@huggingface/transformers';
import type { WorkerRequest, WorkerResponse, LoadProgress } from './protocol';
import type { WhisperWord } from './tokens';

// Fetch models from the Hugging Face hub (no bundled local models)...
env.allowLocalModels = false;
// ...but load the ONNX Runtime WASM binaries from our own origin (self-hosted by
// vite-plugin-static-copy), so the app works offline after the first run and on
// GitHub Pages without a CDN dependency.
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.wasmPaths = import.meta.env.BASE_URL;
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

ctx.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  const run = req.type === 'load' ? handleLoad(req) : handleTranscribe(req);
  run.catch((err: unknown) => {
    post({
      id: req.id,
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
  });
});
