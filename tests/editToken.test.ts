import { describe, it, expect } from 'vitest';
import { replaceTokenText } from '../src/corrections/editToken';
import type { Caption } from '../src/schema/types';

const tok = (text: string, startMs: number): Caption => ({
  text,
  startMs,
  endMs: startMs + 100,
  timestampMs: startMs + 50,
  confidence: null,
  isSentenceEnd: false,
});

describe('replaceTokenText', () => {
  const base = [tok(' chat', 0), tok(' GPT', 100), tok(' rocks', 200)];

  it('replaces only the target token text, preserving every other field', () => {
    const out = replaceTokenText(base, 0, ' ChatGPT');
    expect(out[0].text).toBe(' ChatGPT');
    // timestamps + other fields untouched
    expect(out[0].startMs).toBe(0);
    expect(out[0].endMs).toBe(100);
    expect(out[0].timestampMs).toBe(50);
    expect(out[0].confidence).toBeNull();
    expect(out[0].isSentenceEnd).toBe(false);
    // other tokens untouched
    expect(out[1]).toEqual(base[1]);
    expect(out[2]).toEqual(base[2]);
  });

  it('returns a new array (does not mutate input)', () => {
    const out = replaceTokenText(base, 1, ' GPT-4');
    expect(out).not.toBe(base);
    expect(base[1].text).toBe(' GPT'); // original unchanged
    expect(out[1].text).toBe(' GPT-4');
  });

  it('is a no-op for out-of-range index or unchanged text', () => {
    expect(replaceTokenText(base, 9, 'x')).toBe(base);
    expect(replaceTokenText(base, -1, 'x')).toBe(base);
    expect(replaceTokenText(base, 0, ' chat')).toBe(base);
  });
});
