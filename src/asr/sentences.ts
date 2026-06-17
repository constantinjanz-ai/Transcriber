import type { Caption } from '../schema/types';

/**
 * Heuristic sentence-boundary detection for word-level captions.
 *
 * Whisper emits punctuation inside the word tokens but no explicit sentence
 * markers. `markSentenceEnds` sets `isSentenceEnd` on the token that closes each
 * sentence, so the downstream pipeline can cut on sentence boundaries.
 *
 * This is a heuristic — perfect sentence segmentation is undecidable — tuned to
 * avoid the common false positives (URLs, abbreviations, decimals, German
 * ordinals). The abbreviation set below is the tuning knob.
 */

/**
 * Lowercased words that end in a period but do NOT end a sentence. Extend as
 * needed. (Compared without the trailing period, e.g. "dr" matches "Dr.".)
 */
export const SENTENCE_ABBREVIATIONS = new Set<string>([
  'mr',
  'mrs',
  'ms',
  'dr',
  'prof',
  'sr',
  'jr',
  'st',
  'vs',
  'etc',
  'eg',
  'ie',
  'no',
  'inc',
  'ltd',
  'co',
  'fig',
  'dept',
  'approx',
  'vol',
  'al', // et al.
  // German
  'z', // z.B.
  'bzw',
  'usw',
  'ca',
  'nr',
  'bspw',
  'evtl',
  'inkl',
  'max',
  'min',
]);

const TRAILING_CLOSERS = /[)"'\]”’»]+$/;
// Uppercase (incl. German umlauts), a digit, or an opening quote/bracket.
const STARTS_NEW_SENTENCE = /^[A-ZÄÖÜ0-9"'(«¿¡]/;

/**
 * Decide whether `currentText` ends a sentence, given the following token's text
 * (`nextText`, undefined if this is the last token).
 */
export function isSentenceEnd(currentText: string, nextText?: string): boolean {
  const t = currentText.trim().replace(TRAILING_CLOSERS, '');
  if (!t) return false;

  const last = t[t.length - 1];
  // Strong terminators are reliable regardless of context.
  if (last === '!' || last === '?' || last === '…') return true;
  if (last !== '.') return false;

  // It ends with a period — guard against non-sentence periods.
  const core = t.slice(0, -1);
  if (core.length === 0) return false;

  // Decimals / ordinals: "3." , German "1." → not a sentence end.
  if (/\d$/.test(core)) return false;

  const lastWord = (core.split(/\s+/).pop() ?? '').toLowerCase();
  // Internal-period abbreviations like "a.m.", "U.S.", "e.g." → not an end.
  if (lastWord.includes('.')) return false;
  // Known abbreviations like "Dr.", "etc." → not an end.
  if (SENTENCE_ABBREVIATIONS.has(lastWord)) return false;

  // Otherwise it's a sentence end if it's the last token, or the next token
  // begins a new sentence (capital letter, digit, or opening quote).
  const next = nextText?.trim();
  if (!next) return true;
  return STARTS_NEW_SENTENCE.test(next);
}

/**
 * Return a new array of captions with `isSentenceEnd` set. Runs over the full
 * merged transcript so the next-token lookup works across chunk boundaries.
 */
export function markSentenceEnds(captions: Caption[]): Caption[] {
  return captions.map((cap, i) => ({
    ...cap,
    isSentenceEnd: isSentenceEnd(cap.text, captions[i + 1]?.text),
  }));
}
