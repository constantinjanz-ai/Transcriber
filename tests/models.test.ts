import { describe, it, expect } from 'vitest';
import { modelId, MODEL_SIZES, MODEL_SIZE_INFO } from '../src/asr/models';

describe('modelId', () => {
  it('builds _timestamped repos for the standard sizes', () => {
    expect(modelId('tiny', 'multilingual')).toBe(
      'onnx-community/whisper-tiny_timestamped',
    );
    expect(modelId('base', 'multilingual')).toBe(
      'onnx-community/whisper-base_timestamped',
    );
    expect(modelId('small', 'english')).toBe(
      'onnx-community/whisper-small.en_timestamped',
    );
  });

  it('maps turbo to the large-v3-turbo repo with no .en (multilingual only)', () => {
    const expected = 'onnx-community/whisper-large-v3-turbo_timestamped';
    expect(modelId('turbo', 'multilingual')).toBe(expected);
    // Even if "english" leaks through, turbo never gets a .en suffix.
    expect(modelId('turbo', 'english')).toBe(expected);
  });

  it('every listed size has display info', () => {
    for (const size of MODEL_SIZES) {
      expect(MODEL_SIZE_INFO[size]?.label).toBeTruthy();
      expect(MODEL_SIZE_INFO[size]?.approxDownload).toBeTruthy();
    }
  });
});
