/**
 * The frozen output contract: one word-level token.
 *
 * This matches the `@remotion/captions` `Caption` type. The downstream video
 * pipeline depends on this shape exactly — treat it as frozen.
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
}

export type Transcript = Caption[];
