/**
 * The output contract: one word-level token.
 *
 * The first five fields match the `@remotion/captions` `Caption` type. We add one
 * extension, `isSentenceEnd`, so the downstream pipeline can find sentence
 * boundaries without re-parsing punctuation. The extension is additive — consumers
 * that ignore unknown fields are unaffected — but anything validating strictly
 * against the base Caption shape must be updated to allow it.
 */
export interface Caption {
  /** One word/token as Whisper emits it. Keep Whisper's leading space if present. */
  text: string;
  /** Absolute start time in milliseconds from the start of the media (integer). */
  startMs: number;
  /** Absolute end time in milliseconds (integer). Always >= startMs. */
  endMs: number;
  /** Midpoint of start/end (integer), or null if unknown. */
  timestampMs: number | null;
  /** Confidence 0-1, or null if the model does not provide it. */
  confidence: number | null;
  /** True when this token ends a sentence (extension beyond @remotion/captions). */
  isSentenceEnd: boolean;
}

export type Transcript = Caption[];
