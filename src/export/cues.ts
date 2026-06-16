import type { Caption } from '../schema/types';

export interface Cue {
  startMs: number;
  endMs: number;
  text: string;
}

const MAX_CUE_MS = 6_000;
const MAX_CUE_CHARS = 90;
const SENTENCE_END = /[.!?…]["')\]]?\s*$/;

/**
 * Group word-level captions into sentence-ish cues for .srt/.vtt convenience
 * exports. A cue closes on sentence-ending punctuation, or when it would grow
 * too long in time or characters.
 */
export function groupIntoCues(captions: Caption[]): Cue[] {
  const cues: Cue[] = [];
  let current: { startMs: number; endMs: number; text: string } | null = null;

  const flush = () => {
    if (current && current.text.trim().length > 0) {
      cues.push({
        startMs: current.startMs,
        endMs: current.endMs,
        text: current.text.trim(),
      });
    }
    current = null;
  };

  for (const cap of captions) {
    if (!current) {
      current = { startMs: cap.startMs, endMs: cap.endMs, text: cap.text };
    } else {
      current.text += cap.text;
      current.endMs = cap.endMs;
    }

    const tooLong =
      current.endMs - current.startMs >= MAX_CUE_MS ||
      current.text.length >= MAX_CUE_CHARS;
    if (SENTENCE_END.test(current.text) || tooLong) {
      flush();
    }
  }
  flush();
  return cues;
}

/** Format milliseconds as HH:MM:SS,mmm (SRT) or HH:MM:SS.mmm (VTT). */
export function formatTimestamp(ms: number, msSeparator: ',' | '.'): string {
  const totalSec = Math.floor(ms / 1000);
  const hh = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  const mmm = String(ms % 1000).padStart(3, '0');
  return `${hh}:${mm}:${ss}${msSeparator}${mmm}`;
}
