import { describe, it, expect } from 'vitest';
import { transcriptToText } from '../src/export/txt';
import type { Caption } from '../src/schema/types';

const cap = (text: string, startMs: number, endMs: number): Caption => ({
  text,
  startMs,
  endMs,
  timestampMs: Math.round((startMs + endMs) / 2),
  confidence: null,
});

describe('transcriptToText', () => {
  it('joins tokens into prose and drops timestamps', () => {
    const out = transcriptToText([
      cap(' Hello', 0, 500),
      cap(' there.', 500, 900),
      cap(' How', 900, 1100),
      cap(' are', 1100, 1300),
      cap(' you?', 1300, 1600),
    ]);
    expect(out).toBe('Hello there.\nHow are you?\n');
    expect(out).not.toMatch(/\d/); // no timestamps
  });

  it('collapses whitespace and trims', () => {
    const out = transcriptToText([cap('  Hi ', 0, 100), cap('  world ', 100, 200)]);
    expect(out).toBe('Hi world\n');
  });

  it('returns empty string for an empty transcript', () => {
    expect(transcriptToText([])).toBe('');
  });
});
