import type { Engine, Dtype } from './device';
import type { WhisperWord } from './tokens';

/** Messages from the main thread to the worker. */
export type WorkerRequest =
  | {
      id: number;
      type: 'load';
      modelId: string;
      engine: Engine;
      dtype: Dtype;
    }
  | {
      id: number;
      type: 'transcribe';
      samples: Float32Array;
      /** Whisper language code, or '' for auto-detect. */
      language: string;
      /** English-optimized (.en) models ignore language/task. */
      multilingual: boolean;
    }
  | {
      id: number;
      type: 'detect';
      /** Up to ~30s of mono 16kHz audio to detect the language from. */
      samples: Float32Array;
    };

/** A model-download / load progress event forwarded from transformers.js. */
export interface LoadProgress {
  status: string;
  file?: string;
  /** 0-100 */
  progress?: number;
  loaded?: number;
  total?: number;
  name?: string;
}

/** Messages from the worker back to the main thread. */
export type WorkerResponse =
  | { id: number; type: 'progress'; progress: LoadProgress }
  | { id: number; type: 'loaded' }
  | { id: number; type: 'transcribed'; words: WhisperWord[]; text: string }
  | { id: number; type: 'detected'; language: string }
  | { id: number; type: 'error'; message: string };
