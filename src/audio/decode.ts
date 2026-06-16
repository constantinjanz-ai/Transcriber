import { TARGET_SAMPLE_RATE } from './resample';

/**
 * Browser-only audio decode + resample.
 *
 * Decodes any browser-supported audio/video container with the Web Audio API,
 * then renders it down to mono @ 16 kHz using an OfflineAudioContext (native,
 * high-quality downmix + resample in one pass). Returns the raw PCM ready for
 * Whisper.
 *
 * Not unit-tested in node (Web Audio is browser-only); covered by manual
 * verification. The portable equivalent lives in `resample.ts`.
 */

export class AudioDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AudioDecodeError';
  }
}

export interface DecodedAudio {
  /** Mono PCM @ 16 kHz. */
  samples: Float32Array;
  sampleRate: number;
  /** Total duration in seconds. */
  durationSec: number;
}

function getAudioContextCtor(): typeof AudioContext {
  const ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!ctor) {
    throw new AudioDecodeError('This browser does not support the Web Audio API.');
  }
  return ctor;
}

/**
 * Decode a File/Blob to a mono 16 kHz Float32Array.
 *
 * Reads the file into an ArrayBuffer, decodes it, and resamples via
 * OfflineAudioContext. The decoded AudioBuffer is released once rendering is
 * scheduled so peak memory stays bounded on large files.
 */
export async function decodeToMono16k(file: Blob): Promise<DecodedAudio> {
  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch (err) {
    throw new AudioDecodeError(
      `Could not read the file: ${(err as Error).message ?? err}`,
    );
  }

  const AudioCtx = getAudioContextCtor();
  const decodeCtx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    // decodeAudioData detaches the ArrayBuffer; that's fine, we don't reuse it.
    decoded = await decodeCtx.decodeAudioData(arrayBuffer);
  } catch {
    throw new AudioDecodeError(
      'Could not decode this file. The codec may be unsupported in this browser — ' +
        'try exporting the audio as WAV or MP3 and uploading that.',
    );
  } finally {
    void decodeCtx.close();
  }

  const durationSec = decoded.duration;
  const targetLength = Math.max(1, Math.ceil(durationSec * TARGET_SAMPLE_RATE));

  const offline = new OfflineAudioContext(1, targetLength, TARGET_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();

  const rendered = await offline.startRendering();
  // Copy out the single mono channel; the rendered buffer can now be GC'd.
  const samples = rendered.getChannelData(0).slice();

  return { samples, sampleRate: TARGET_SAMPLE_RATE, durationSec };
}
