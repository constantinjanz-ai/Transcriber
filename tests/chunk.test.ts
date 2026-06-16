import { describe, it, expect } from 'vitest';
import { chunkSamples } from '../src/audio/chunk';

const RATE = 16_000;

describe('chunkSamples', () => {
  it('splits into ~30s windows with correct global offsets', () => {
    // 70 seconds of audio -> 30 + 30 + 10
    const samples = new Float32Array(70 * RATE);
    const chunks = chunkSamples(samples, RATE, 30);

    expect(chunks.length).toBe(3);
    expect(chunks.map((c) => c.index)).toEqual([0, 1, 2]);
    expect(chunks[0].startMs).toBe(0);
    expect(chunks[0].endMs).toBe(30_000);
    expect(chunks[1].startMs).toBe(30_000);
    expect(chunks[1].endMs).toBe(60_000);
    expect(chunks[2].startMs).toBe(60_000);
    expect(chunks[2].endMs).toBe(70_000);
  });

  it('makes windows contiguous (each start == previous end)', () => {
    const samples = new Float32Array(95 * RATE);
    const chunks = chunkSamples(samples, RATE, 30);
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].startMs).toBe(chunks[i - 1].endMs);
    }
  });

  it('returns views that cover the whole buffer without copying', () => {
    const samples = new Float32Array(45 * RATE);
    const chunks = chunkSamples(samples, RATE, 30);
    const totalLen = chunks.reduce((n, c) => n + c.samples.length, 0);
    expect(totalLen).toBe(samples.length);
    // subarray shares the backing buffer
    expect(chunks[0].samples.buffer).toBe(samples.buffer);
  });

  it('returns empty for empty input', () => {
    expect(chunkSamples(new Float32Array(0), RATE, 30)).toEqual([]);
  });

  it('validates arguments', () => {
    expect(() => chunkSamples(new Float32Array(10), 0, 30)).toThrow();
    expect(() => chunkSamples(new Float32Array(10), RATE, 0)).toThrow();
  });
});
