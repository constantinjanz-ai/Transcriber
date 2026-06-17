import { describe, it, expect } from 'vitest';
import {
  captionsFromWords,
  mergeChunkCaptions,
  type WhisperWord,
} from '../src/asr/tokens';

describe('captionsFromWords', () => {
  it('maps words to the contract shape with a global offset', () => {
    const words: WhisperWord[] = [
      { text: ' You', timestamp: [0, 0.26] },
      { text: " can't", timestamp: [0.26, 0.52] },
    ];
    // chunk starts at 30s
    const caps = captionsFromWords(words, 30_000, 60_000);

    expect(caps[0]).toEqual({
      text: ' You',
      startMs: 30_000,
      endMs: 30_260,
      timestampMs: 30_130,
      confidence: null,
    });
    expect(caps[1].text).toBe(" can't");
    expect(caps[1].startMs).toBe(30_260);
    expect(caps[1].endMs).toBe(30_520);
  });

  it("keeps Whisper's leading space verbatim", () => {
    const caps = captionsFromWords([{ text: ' hello', timestamp: [0, 0.5] }], 0, 1000);
    expect(caps[0].text).toBe(' hello');
  });

  it('falls back to the next word start when an end is missing', () => {
    const words: WhisperWord[] = [
      { text: ' a', timestamp: [0, null] },
      { text: ' b', timestamp: [0.4, 0.8] },
    ];
    const caps = captionsFromWords(words, 0, 5000);
    expect(caps[0].endMs).toBe(400); // borrowed from next word's start
  });

  it('falls back to chunk end for a trailing word with no end', () => {
    const words: WhisperWord[] = [{ text: ' last', timestamp: [1.0, null] }];
    const caps = captionsFromWords(words, 10_000, 12_000);
    // chunk end is 12_000 absolute -> 2.0s relative
    expect(caps[0].endMs).toBe(12_000);
  });

  it('clamps endMs to be >= startMs and rounds to integers', () => {
    const words: WhisperWord[] = [{ text: ' x', timestamp: [0.5, 0.4999] }];
    const caps = captionsFromWords(words, 0, 1000);
    expect(caps[0].endMs).toBeGreaterThanOrEqual(caps[0].startMs);
    expect(Number.isInteger(caps[0].startMs)).toBe(true);
    expect(Number.isInteger(caps[0].endMs)).toBe(true);
    expect(Number.isInteger(caps[0].timestampMs as number)).toBe(true);
  });

  it('caps an over-long word (pause / chunk-boundary artifact) at maxWordMs', () => {
    // A trailing word with no end falls back to the chunk end -> 30s long.
    const words: WhisperWord[] = [{ text: ' Perfect.', timestamp: [0, null] }];
    const caps = captionsFromWords(words, 0, 30_000); // default cap = 2000ms
    expect(caps[0].endMs).toBe(2000);
    expect(caps[0].timestampMs).toBe(1000);
  });

  it('leaves normal-length words untouched', () => {
    const words: WhisperWord[] = [{ text: ' hello', timestamp: [0, 0.6] }];
    const caps = captionsFromWords(words, 0, 30_000);
    expect(caps[0].endMs).toBe(600);
  });
});

describe('mergeChunkCaptions', () => {
  it('concatenates chunks into one chronological stream', () => {
    const chunk0 = captionsFromWords([{ text: ' one', timestamp: [0, 1] }], 0, 30_000);
    const chunk1 = captionsFromWords(
      [{ text: ' two', timestamp: [0, 1] }],
      30_000,
      60_000,
    );
    const merged = mergeChunkCaptions([chunk0, chunk1]);

    expect(merged.map((c) => c.text)).toEqual([' one', ' two']);
    expect(merged[0].startMs).toBe(0);
    expect(merged[1].startMs).toBe(30_000);
    // strictly non-decreasing starts
    for (let i = 1; i < merged.length; i++) {
      expect(merged[i].startMs).toBeGreaterThanOrEqual(merged[i - 1].startMs);
    }
  });
});
