import { describe, it, expect } from 'vitest';
import { applyCorrections } from '../src/corrections/apply';
import type { Caption } from '../src/schema/types';

let t = 0;
/** Build a token; each call advances time so timestamps are realistic/monotonic. */
function cap(
  text: string,
  opts: { end?: boolean; confidence?: number | null } = {},
): Caption {
  const startMs = t;
  const endMs = (t += 200);
  return {
    text,
    startMs,
    endMs,
    timestampMs: Math.round((startMs + endMs) / 2),
    confidence: opts.confidence ?? null,
    isSentenceEnd: opts.end ?? false,
  };
}
const reset = () => {
  t = 0;
};

const texts = (toks: Caption[]) => toks.map((x) => x.text);

describe('applyCorrections — phrase merges', () => {
  it('merges "chat GPT" -> " ChatGPT" preserving timing/contract', () => {
    reset();
    const a = cap(' chat', { confidence: 0.9 });
    const b = cap(' GPT', { end: true, confidence: 0.7 });
    const out = applyCorrections([a, b]);
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe(' ChatGPT');
    expect(out[0].startMs).toBe(a.startMs); // start of first
    expect(out[0].endMs).toBe(b.endMs); // end of last
    expect(out[0].timestampMs).toBe(Math.round((a.startMs + b.endMs) / 2));
    expect(out[0].confidence).toBe(0.7); // min of merged
    expect(out[0].isSentenceEnd).toBe(true); // last token's value
  });

  it('prefers the longest phrase: "chat GPT shopping" -> " ChatGPT Shopping"', () => {
    reset();
    const out = applyCorrections([cap(' chat'), cap(' GPT'), cap(' shopping')]);
    expect(texts(out)).toEqual([' ChatGPT Shopping']);
  });

  it('maps the seed phrases to canonical forms', () => {
    reset();
    expect(texts(applyCorrections([cap(' G'), cap(' E'), cap(' O')]))).toEqual([' GEO']);
    expect(texts(applyCorrections([cap(' fan'), cap(' out')]))).toEqual([' fan-out']);
    expect(texts(applyCorrections([cap(' fan'), cap(' art')]))).toEqual([' fan-out']);
    expect(texts(applyCorrections([cap(' llms'), cap(' text')]))).toEqual([' llms.txt']);
    expect(texts(applyCorrections([cap(' AI'), cap(' overview')]))).toEqual([
      ' AI Overviews',
    ]);
    expect(texts(applyCorrections([cap(' schema'), cap(' mark'), cap(' up')]))).toEqual([
      ' schema markup',
    ]);
  });

  it('keeps timestamps monotonic across a mixed transcript', () => {
    reset();
    const out = applyCorrections([
      cap(' chat'),
      cap(' GPT'),
      cap(' is'),
      cap(' fan'),
      cap(' out'),
    ]);
    expect(texts(out)).toEqual([' ChatGPT', ' is', ' fan-out']);
    for (let i = 1; i < out.length; i++) {
      expect(out[i].startMs).toBeGreaterThanOrEqual(out[i - 1].startMs);
      expect(out[i].endMs).toBeGreaterThanOrEqual(out[i].startMs);
    }
  });
});

describe('applyCorrections — single-token fixes', () => {
  it('replaces whole words case-insensitively, preserving space + punctuation', () => {
    reset();
    expect(texts(applyCorrections([cap(' geo,')]))).toEqual([' GEO,']);
    expect(texts(applyCorrections([cap(' Pika')]))).toEqual([' Peec']);
    expect(texts(applyCorrections([cap(' perplexity.')]))).toEqual([' Perplexity.']);
    expect(texts(applyCorrections([cap(' shopify')]))).toEqual([' Shopify']);
    expect(texts(applyCorrections([cap(' co-pilot')]))).toEqual([' Copilot']);
    expect(texts(applyCorrections([cap(' llms')]))).toEqual([' LLMs']);
  });

  it('does not touch non-matching or partial words', () => {
    reset();
    expect(texts(applyCorrections([cap(' geography')]))).toEqual([' geography']);
    expect(texts(applyCorrections([cap(' the'), cap(' team')]))).toEqual([
      ' the',
      ' team',
    ]);
  });
});

describe('applyCorrections — risky gating', () => {
  it('applies risky variants by default (brand context)', () => {
    reset();
    expect(texts(applyCorrections([cap(' peak')]))).toEqual([' Peec']);
    expect(texts(applyCorrections([cap(' roofers')]))).toEqual([' Perplexity']);
  });

  it('skips risky variants when includeRisky is false', () => {
    reset();
    expect(texts(applyCorrections([cap(' peak')], { includeRisky: false }))).toEqual([
      ' peak',
    ]);
    expect(texts(applyCorrections([cap(' roofers')], { includeRisky: false }))).toEqual([
      ' roofers',
    ]);
    // safe single-word fixes still apply
    expect(texts(applyCorrections([cap(' geo')], { includeRisky: false }))).toEqual([
      ' GEO',
    ]);
  });
});
