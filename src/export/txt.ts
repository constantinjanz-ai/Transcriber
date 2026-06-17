import type { Caption } from '../schema/types';

/**
 * Render captions as a plain-text transcript (no timestamps).
 *
 * Joins the word tokens back into prose (Whisper's leading spaces make this
 * natural), collapses any runs of whitespace, and puts each sentence on its own
 * line so the result is easy to skim or paste elsewhere.
 */
export function transcriptToText(captions: Caption[]): string {
  const prose = captions
    .map((c) => c.text)
    .join('')
    .replace(/[ \t]+/g, ' ')
    .trim();
  if (!prose) return '';
  // Break after sentence-ending punctuation for readability.
  return prose.replace(/([.!?…])\s+/g, '$1\n') + '\n';
}
