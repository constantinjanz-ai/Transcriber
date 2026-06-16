/**
 * Pure, dependency-free audio DSP helpers.
 *
 * These are the algorithmic reference for downmixing and resampling and are
 * fully unit-tested in node (no Web Audio API needed). The browser decode path
 * (`decode.ts`) uses the native OfflineAudioContext for higher-quality
 * resampling; these functions are the portable equivalent and the basis of a
 * future headless/Node path.
 */

export const TARGET_SAMPLE_RATE = 16_000;

/**
 * Average N channel buffers into a single mono buffer.
 * Returns the input unchanged when there is already a single channel.
 */
export function downmixToMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 0) return new Float32Array(0);
  if (channels.length === 1) return channels[0];

  const length = channels[0].length;
  const out = new Float32Array(length);
  for (let c = 0; c < channels.length; c++) {
    const ch = channels[c];
    for (let i = 0; i < length; i++) {
      out[i] += ch[i];
    }
  }
  const inv = 1 / channels.length;
  for (let i = 0; i < length; i++) {
    out[i] *= inv;
  }
  return out;
}

/**
 * Resample a mono signal from `inputRate` to `outputRate` using linear
 * interpolation. Output length is `round(input.length * outputRate / inputRate)`.
 */
export function resampleLinear(
  input: Float32Array,
  inputRate: number,
  outputRate: number,
): Float32Array {
  if (inputRate <= 0 || outputRate <= 0) {
    throw new Error('Sample rates must be positive.');
  }
  if (inputRate === outputRate) return input;
  if (input.length === 0) return new Float32Array(0);

  const ratio = inputRate / outputRate;
  const outLength = Math.round(input.length / ratio);
  const out = new Float32Array(outLength);

  for (let i = 0; i < outLength; i++) {
    const srcPos = i * ratio;
    const i0 = Math.floor(srcPos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = srcPos - i0;
    out[i] = input[i0] * (1 - frac) + input[i1] * frac;
  }
  return out;
}
