import type { Caption } from '../schema/types';

/**
 * Return a new transcript with token `index`'s `text` replaced. All other fields
 * (timestamps, confidence, isSentenceEnd) and other tokens are untouched, so the
 * contract and timing stay intact. Out-of-range indices return the input unchanged.
 *
 * Pure — used by the in-app word editor.
 */
export function replaceTokenText(
  tokens: Caption[],
  index: number,
  text: string,
): Caption[] {
  if (index < 0 || index >= tokens.length) return tokens;
  if (tokens[index].text === text) return tokens;
  return tokens.map((t, i) => (i === index ? { ...t, text } : t));
}
