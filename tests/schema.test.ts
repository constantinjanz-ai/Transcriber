import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateTranscript } from '../src/schema/validate';
import type { Caption } from '../src/schema/types';

const sample = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../sample/transcript.example.json', import.meta.url)),
    'utf-8',
  ),
);

const goodToken = (): Caption => ({
  text: ' word',
  startMs: 0,
  endMs: 100,
  timestampMs: 50,
  confidence: null,
  isSentenceEnd: false,
});

describe('validateTranscript', () => {
  it('accepts the bundled sample', () => {
    const result = validateTranscript(sample);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('accepts an empty transcript', () => {
    expect(validateTranscript([]).valid).toBe(true);
  });

  it('rejects non-integer timestamps', () => {
    const bad = [{ ...goodToken(), startMs: 10.5 }];
    expect(validateTranscript(bad).valid).toBe(false);
  });

  it('rejects endMs < startMs', () => {
    const bad = [{ ...goodToken(), startMs: 200, endMs: 100 }];
    const res = validateTranscript(bad);
    expect(res.valid).toBe(false);
    expect(res.errors.join(' ')).toMatch(/endMs/);
  });

  it('rejects non-chronological tokens', () => {
    const bad = [
      { ...goodToken(), startMs: 500, endMs: 600, timestampMs: 550 },
      { ...goodToken(), startMs: 100, endMs: 200, timestampMs: 150 },
    ];
    const res = validateTranscript(bad);
    expect(res.valid).toBe(false);
    expect(res.errors.join(' ')).toMatch(/chronological/);
  });

  it('rejects unknown properties', () => {
    const bad = [{ ...goodToken(), speaker: 'A' }];
    expect(validateTranscript(bad).valid).toBe(false);
  });

  it('rejects a missing required field', () => {
    const token = goodToken() as Partial<Caption>;
    delete token.confidence;
    expect(validateTranscript([token]).valid).toBe(false);
  });

  it('requires isSentenceEnd and rejects a non-boolean value', () => {
    const missing = goodToken() as Partial<Caption>;
    delete missing.isSentenceEnd;
    expect(validateTranscript([missing]).valid).toBe(false);
    expect(validateTranscript([{ ...goodToken(), isSentenceEnd: 'yes' }]).valid).toBe(
      false,
    );
  });

  it('rejects confidence out of range', () => {
    expect(validateTranscript([{ ...goodToken(), confidence: 1.5 }]).valid).toBe(false);
  });

  it('accepts a numeric confidence within range', () => {
    expect(validateTranscript([{ ...goodToken(), confidence: 0.92 }]).valid).toBe(true);
  });
});
