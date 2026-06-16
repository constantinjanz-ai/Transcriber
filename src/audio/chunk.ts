/**
 * Pure chunking of a mono PCM buffer into fixed-length windows.
 *
 * Whisper processes ~30 s at a time. Splitting the resampled audio into windows
 * lets us show per-chunk progress, free memory between chunks, and keep the tab
 * responsive on hour-long recordings. Each window carries its absolute start/end
 * in milliseconds so word timestamps can be offset to a global timeline.
 */

export interface AudioChunk {
  /** Mono PCM samples for this window (a view into the source buffer). */
  samples: Float32Array;
  /** Absolute start of this window in milliseconds. */
  startMs: number;
  /** Absolute end of this window in milliseconds. */
  endMs: number;
  /** Zero-based index of this window. */
  index: number;
}

export const DEFAULT_WINDOW_SECONDS = 30;

/**
 * Slice `samples` (mono, at `sampleRate`) into non-overlapping windows of
 * `windowSeconds`. Uses `subarray` so no PCM data is copied.
 */
export function chunkSamples(
  samples: Float32Array,
  sampleRate: number,
  windowSeconds: number = DEFAULT_WINDOW_SECONDS,
): AudioChunk[] {
  if (sampleRate <= 0) throw new Error('sampleRate must be positive.');
  if (windowSeconds <= 0) throw new Error('windowSeconds must be positive.');
  if (samples.length === 0) return [];

  const windowSamples = Math.round(windowSeconds * sampleRate);
  const msPerSample = 1000 / sampleRate;
  const chunks: AudioChunk[] = [];

  for (
    let start = 0, index = 0;
    start < samples.length;
    start += windowSamples, index++
  ) {
    const end = Math.min(start + windowSamples, samples.length);
    chunks.push({
      samples: samples.subarray(start, end),
      startMs: Math.round(start * msPerSample),
      endMs: Math.round(end * msPerSample),
      index,
    });
  }
  return chunks;
}
