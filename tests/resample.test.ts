import { describe, it, expect } from 'vitest';
import { downmixToMono, resampleLinear } from '../src/audio/resample';

describe('downmixToMono', () => {
  it('averages multiple channels sample-by-sample', () => {
    const left = new Float32Array([1, 0, -1, 0.5]);
    const right = new Float32Array([0, 1, 1, -0.5]);
    const mono = downmixToMono([left, right]);
    expect(Array.from(mono)).toEqual([0.5, 0.5, 0, 0]);
  });

  it('returns the single channel unchanged', () => {
    const mono = new Float32Array([0.1, 0.2]);
    expect(downmixToMono([mono])).toBe(mono);
  });

  it('handles empty input', () => {
    expect(downmixToMono([]).length).toBe(0);
  });
});

describe('resampleLinear', () => {
  it('produces round(len * out/in) samples when downsampling 48k -> 16k', () => {
    const input = new Float32Array(48_000); // 1 second @ 48k
    const out = resampleLinear(input, 48_000, 16_000);
    expect(out.length).toBe(16_000);
  });

  it('is a no-op when rates match', () => {
    const input = new Float32Array([0.1, 0.2, 0.3]);
    expect(resampleLinear(input, 16_000, 16_000)).toBe(input);
  });

  it('preserves a sine wave reasonably (downsampling 44.1k -> 16k)', () => {
    const inRate = 44_100;
    const outRate = 16_000;
    const freq = 440;
    const seconds = 0.25;
    const input = new Float32Array(Math.round(inRate * seconds));
    for (let i = 0; i < input.length; i++) {
      input[i] = Math.sin((2 * Math.PI * freq * i) / inRate);
    }

    const out = resampleLinear(input, inRate, outRate);
    expect(out.length).toBe(Math.round(input.length / (inRate / outRate)));

    // Amplitude is bounded and the signal isn't silenced.
    let max = 0;
    for (const v of out) max = Math.max(max, Math.abs(v));
    expect(max).toBeGreaterThan(0.8);
    expect(max).toBeLessThanOrEqual(1.0001);
  });

  it('rejects non-positive sample rates', () => {
    expect(() => resampleLinear(new Float32Array([1]), 0, 16_000)).toThrow();
  });
});
