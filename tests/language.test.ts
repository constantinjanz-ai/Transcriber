import { describe, it, expect } from 'vitest';
import { pickLanguageFromLogits, languageLabel } from '../src/asr/language';

// A tiny fake vocabulary: language tokens at known ids, plus unrelated tokens.
const langToId = { '<|en|>': 1, '<|de|>': 2, '<|fr|>': 3 };

describe('pickLanguageFromLogits', () => {
  it('returns the code of the highest-scoring language token', () => {
    //               id0  en   de   fr
    const logits = [0.0, 0.1, 9.9, 0.2];
    expect(pickLanguageFromLogits(logits, langToId)).toBe('de');
  });

  it('picks English when its token wins', () => {
    const logits = [0.0, 5.0, 1.0, 2.0];
    expect(pickLanguageFromLogits(logits, langToId)).toBe('en');
  });

  it('ignores non-language vocabulary positions (even if larger)', () => {
    // index 0 is huge but not a language token -> must be ignored.
    const logits = [100, 0.1, 0.4, 0.2];
    expect(pickLanguageFromLogits(logits, langToId)).toBe('de');
  });

  it('skips ids that fall outside the logits array', () => {
    const logits = [0.0, 0.5]; // only id 0 and 1 exist
    expect(pickLanguageFromLogits(logits, langToId)).toBe('en');
  });

  it('returns "" when no language token can be scored', () => {
    expect(pickLanguageFromLogits([], langToId)).toBe('');
  });
});

describe('languageLabel', () => {
  it('maps known codes to labels', () => {
    expect(languageLabel('de')).toBe('German');
    expect(languageLabel('en')).toBe('English');
  });

  it('falls back to the uppercased code for unknowns', () => {
    expect(languageLabel('xx')).toBe('XX');
  });
});
