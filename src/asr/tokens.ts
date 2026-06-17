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
 * Cap on a single word's duration (ms). Whisper occasionally assigns a wildly
 * long end time to a word at a pause or a chunk boundary (e.g. a 25s "Perfect.").
 * Capping keeps captions from lingering on screen downstream. No real spoken
 * word lasts this long, so legitimate words are unaffected.
 */
export const MAX_WORD_DURATION_MS = 2000;

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
 *  - a word's duration is capped at `maxWordMs` (see MAX_WORD_DURATION_MS).
 *  - all ms are integers; `endMs >= startMs`; `timestampMs` is the midpoint.
 *  - `confidence` is always null (Whisper does not provide per-word confidence).
 */
export function captionsFromWords(
  words: WhisperWord[],
  offsetMs: number,
  chunkEndMs: number,
  maxWordMs: number = MAX_WORD_DURATION_MS,
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
    if (endMs - startMs > maxWordMs) endMs = startMs + maxWordMs;

    captions.push({
      text: word.text,
      startMs,
      endMs,
      timestampMs: round((startMs + endMs) / 2),
      confidence: null,
      // Placeholder; set by markSentenceEnds() over the full merged transcript.
      isSentenceEnd: false,
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
