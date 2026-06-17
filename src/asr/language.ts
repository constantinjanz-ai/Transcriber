import { LANGUAGES } from './models';

/**
 * Pick the most likely language from a Whisper decoder's first-step logits.
 *
 * Whisper detects language from the token it would emit right after
 * `<|startoftranscript|>`: the highest-scoring among the per-language tokens
 * (`<|en|>`, `<|de|>`, …). `langToId` maps those token strings to vocab ids.
 *
 * Pure and unit-tested. Returns the bare language code (e.g. `"de"`), or `""`
 * if no language token could be scored.
 */
export function pickLanguageFromLogits(
  logits: ArrayLike<number>,
  langToId: Record<string, number>,
): string {
  let bestToken = '';
  let bestScore = -Infinity;

  for (const token in langToId) {
    const id = langToId[token];
    if (id == null || id < 0 || id >= logits.length) continue;
    const score = logits[id];
    if (score > bestScore) {
      bestScore = score;
      bestToken = token;
    }
  }

  // Token looks like "<|de|>" -> "de".
  const match = /^<\|([a-z]{2,3})\|>$/.exec(bestToken);
  return match ? match[1] : '';
}

const LABELS: Record<string, string> = Object.fromEntries(
  LANGUAGES.filter((l) => l.code).map((l) => [l.code, l.label]),
);

/** Human label for a language code, e.g. "de" -> "German". Falls back to the code. */
export function languageLabel(code: string): string {
  return LABELS[code] ?? code.toUpperCase();
}
