import type { Engine, Dtype } from './device';
import type { WhisperWord } from './tokens';
import type { WorkerRequest, WorkerResponse, LoadProgress } from './protocol';

/**
 * Main-thread wrapper around the ASR Web Worker. Turns the postMessage protocol
 * into promises and routes load-progress events to a callback. One request is
 * in flight at a time (transcription is sequential).
 */
export class WhisperClient {
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<
    number,
    {
      resolve: (value: WorkerResponse) => void;
      reject: (err: Error) => void;
      onProgress?: (p: LoadProgress) => void;
    }
  >();

  constructor() {
    this.worker = new Worker(new URL('./whisper.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker.addEventListener('message', this.onMessage);
  }

  private onMessage = (event: MessageEvent<WorkerResponse>) => {
    const msg = event.data;
    const entry = this.pending.get(msg.id);
    if (!entry) return;

    switch (msg.type) {
      case 'progress':
        entry.onProgress?.(msg.progress);
        break;
      case 'error':
        this.pending.delete(msg.id);
        entry.reject(new Error(msg.message));
        break;
      default:
        this.pending.delete(msg.id);
        entry.resolve(msg);
    }
  };

  private send(
    req: WorkerRequest,
    transfer: Transferable[],
    onProgress?: (p: LoadProgress) => void,
  ): Promise<WorkerResponse> {
    return new Promise((resolve, reject) => {
      this.pending.set(req.id, { resolve, reject, onProgress });
      this.worker.postMessage(req, transfer);
    });
  }

  /** Load (download + initialize) a model on the given engine. */
  async load(
    modelId: string,
    engine: Engine,
    dtype: Dtype,
    onProgress?: (p: LoadProgress) => void,
  ): Promise<void> {
    await this.send(
      { id: this.nextId++, type: 'load', modelId, engine, dtype },
      [],
      onProgress,
    );
  }

  /**
   * Transcribe one mono 16 kHz chunk. The samples buffer is transferred to the
   * worker (zero-copy); do not reuse it on the caller side afterwards.
   */
  async transcribe(
    samples: Float32Array,
    language: string,
    multilingual: boolean,
  ): Promise<WhisperWord[]> {
    const res = await this.send(
      { id: this.nextId++, type: 'transcribe', samples, language, multilingual },
      [samples.buffer],
    );
    if (res.type !== 'transcribed') {
      throw new Error('Unexpected worker response.');
    }
    return res.words;
  }

  /**
   * Detect the spoken language from up to ~30s of mono 16 kHz audio. Returns a
   * Whisper language code (e.g. "de"), or "" if none could be determined. The
   * samples buffer is transferred; do not reuse it afterwards.
   */
  async detectLanguage(samples: Float32Array): Promise<string> {
    const res = await this.send({ id: this.nextId++, type: 'detect', samples }, [
      samples.buffer,
    ]);
    if (res.type !== 'detected') {
      throw new Error('Unexpected worker response.');
    }
    return res.language;
  }

  dispose(): void {
    this.worker.removeEventListener('message', this.onMessage);
    this.worker.terminate();
    this.pending.clear();
  }
}
