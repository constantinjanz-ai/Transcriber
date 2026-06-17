import { decodeToMono16k } from './audio/decode';
import { chunkSamples, DEFAULT_WINDOW_SECONDS } from './audio/chunk';
import { captionsFromWords, mergeChunkCaptions } from './asr/tokens';
import { markSentenceEnds } from './asr/sentences';
import type { WhisperClient } from './asr/whisperClient';
import type { Caption } from './schema/types';
import type { EngineConfig } from './asr/models';

export interface TranscribeProgress {
  /** 1-based index of the chunk just finished. */
  chunkIndex: number;
  chunkCount: number;
  /** Words produced so far across the whole file. */
  wordCount: number;
  /** Rough estimate of seconds remaining, or null until we have a sample. */
  etaSeconds: number | null;
}

export interface TranscribeCallbacks {
  onStatus?: (status: string) => void;
  onProgress?: (p: TranscribeProgress) => void;
}

const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * End-to-end transcription of one file into contract captions.
 *
 * Decodes + resamples to mono 16 kHz, splits into ~30 s windows, runs each
 * window through the (already-loaded) Whisper worker, and offsets word
 * timestamps onto a single global timeline. Yields to the UI between chunks so
 * progress repaints and the tab stays responsive on hour-long files.
 *
 * The caller is responsible for loading the model on `client` first (so model
 * download progress can be reported separately).
 */
export async function transcribeFile(
  file: File,
  client: WhisperClient,
  config: EngineConfig,
  callbacks: TranscribeCallbacks = {},
): Promise<Caption[]> {
  const { onStatus, onProgress } = callbacks;
  const multilingual = config.mode === 'multilingual';

  onStatus?.('Decoding & resampling audio…');
  const { samples } = await decodeToMono16k(file);

  const chunks = chunkSamples(samples, 16_000, DEFAULT_WINDOW_SECONDS);
  const perChunk: Caption[][] = [];
  let wordCount = 0;
  const startedAt = performance.now();

  for (const chunk of chunks) {
    onStatus?.(`Transcribing chunk ${chunk.index + 1} / ${chunks.length}…`);

    // Copy the window into its own buffer before transferring to the worker —
    // the chunk is a subarray view of the shared decode buffer, so transferring
    // the shared buffer directly would detach every other chunk.
    const words = await client.transcribe(
      chunk.samples.slice(),
      config.language,
      multilingual,
    );
    perChunk.push(captionsFromWords(words, chunk.startMs, chunk.endMs));
    wordCount += words.length;

    const done = chunk.index + 1;
    const elapsed = (performance.now() - startedAt) / 1000;
    const etaSeconds = done > 0 ? (elapsed / done) * (chunks.length - done) : null;
    onProgress?.({
      chunkIndex: done,
      chunkCount: chunks.length,
      wordCount,
      etaSeconds,
    });

    await yieldToUi();
  }

  // Mark sentence ends over the whole transcript so the next-token lookup spans
  // chunk boundaries.
  return markSentenceEnds(mergeChunkCaptions(perChunk));
}
