import type { Caption } from '../schema/types';

/**
 * A word emitted by Whisper with `return_timestamps: 'word'`.
 * `timestamp` is `[startSec, endSec]` relative to the start of the chunk;
 * `endSec` may be null/undefined when the model didn't produce one.
 */
export interface WhisperWord {
  text: string;
  timestamp: [number | null | undefined, number | null | undefined];
}

const round = Math.round;

/**
 * Map one chunk's Whisper words to contract `Caption` tokens on a global
 * timeline.
 *
 * @param words        words for this chunk (chunk-relative seconds)
 * @param offsetMs     absolute start of the chunk in ms (added to every token)
 * @param chunkEndMs   absolute end of the chunk in ms (fallback end for the
 *                     last word when it lacks an end timestamp)
 *
 * Rules (frozen contract):
 *  - `text` kept verbatim, including Whisper's leading space.
 *  - missing end time falls back to the next word's start, else `chunkEndMs`.
 *  - all ms are integers; `endMs >= startMs`; `timestampMs` is the midpoint.
 *  - `confidence` is always null (Whisper does not provide per-word confidence).
 */
export function captionsFromWords(
  words: WhisperWord[],
  offsetMs: number,
  chunkEndMs: number,
): Caption[] {
  const captions: Caption[] = [];
  let prevEndSec = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    const rawStart = word.timestamp[0];
    const startSec = rawStart == null ? prevEndSec : rawStart;

    let endSec = word.timestamp[1];
    if (endSec == null) {
      // Fall back to the next word's start, else the chunk end.
      const next = words[i + 1]?.timestamp[0];
      endSec = next != null ? next : (chunkEndMs - offsetMs) / 1000;
    }

    const startMs = round(startSec * 1000) + offsetMs;
    let endMs = round(endSec * 1000) + offsetMs;
    if (endMs < startMs) endMs = startMs;

    captions.push({
      text: word.text,
      startMs,
      endMs,
      timestampMs: round((startMs + endMs) / 2),
      confidence: null,
    });

    prevEndSec = endSec;
  }

  return captions;
}

/**
 * Concatenate per-chunk captions into one chronologically ordered transcript.
 * Chunks are already produced in order with absolute (global) offsets, so this
 * is a flatten — kept as a named step so the global-timeline guarantee is
 * explicit and unit-tested.
 */
export function mergeChunkCaptions(perChunk: Caption[][]): Caption[] {
  return perChunk.flat();
}
