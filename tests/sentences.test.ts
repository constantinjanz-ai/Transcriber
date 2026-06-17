import { describe, it, expect } from 'vitest';
import { isSentenceEnd, markSentenceEnds } from '../src/asr/sentences';
import type { Caption } from '../src/schema/types';

const cap = (text: string): Caption => ({
  text,
  startMs: 0,
  endMs: 100,
  timestampMs: 50,
  confidence: null,
  isSentenceEnd: false,
});

describe('isSentenceEnd', () => {
  it('treats ! ? … as reliable sentence ends', () => {
    expect(isSentenceEnd(' really!', ' next')).toBe(true);
    expect(isSentenceEnd(' what?', ' next')).toBe(true);
    expect(isSentenceEnd(' well…', ' next')).toBe(true);
  });

  it('ends on a period when the next token starts a new sentence', () => {
    expect(isSentenceEnd(' measure.', ' The')).toBe(true);
  });

  it('ends on a period when it is the last token', () => {
    expect(isSentenceEnd(' done.', undefined)).toBe(true);
  });

  it('does not end when the next token is lowercase', () => {
    expect(isSentenceEnd(' v1.', ' beta')).toBe(false);
  });

  it('ignores URLs and decimals (no trailing period)', () => {
    expect(isSentenceEnd(' example.com', ' is')).toBe(false);
    expect(isSentenceEnd(' 3.5', ' percent')).toBe(false);
  });

  it('ignores abbreviations and internal-period tokens', () => {
    expect(isSentenceEnd(' Dr.', ' Smith')).toBe(false);
    expect(isSentenceEnd(' etc.', ' And')).toBe(false);
    expect(isSentenceEnd(' a.m.', ' We')).toBe(false);
    expect(isSentenceEnd(' z.B.', ' Das')).toBe(false);
  });

  it('ignores German ordinals (digit before the period)', () => {
    expect(isSentenceEnd(' 1.', ' Januar')).toBe(false);
  });

  it('looks through trailing quotes/brackets', () => {
    expect(isSentenceEnd(' over."', ' Then')).toBe(true);
  });

  it('returns false for tokens with no terminal punctuation', () => {
    expect(isSentenceEnd(' hello', ' world')).toBe(false);
  });
});

describe('markSentenceEnds', () => {
  it('flags only sentence-ending tokens and preserves order/length', () => {
    const caps = [' Hello', ' there.', ' How', ' are', ' you?'].map(cap);
    const out = markSentenceEnds(caps);
    expect(out.map((c) => c.isSentenceEnd)).toEqual([false, true, false, false, true]);
    expect(out.map((c) => c.text)).toEqual(caps.map((c) => c.text));
  });

  it('does not mutate the input captions', () => {
    const caps = [cap(' end.')];
    const out = markSentenceEnds(caps);
    expect(caps[0].isSentenceEnd).toBe(false);
    expect(out[0].isSentenceEnd).toBe(true);
  });
});
