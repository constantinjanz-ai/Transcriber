/** Accepted upload formats and the (pure, testable) acceptance check. */

export const ACCEPTED_EXTENSIONS = [
  '.mp4',
  '.mov',
  '.m4a',
  '.mp3',
  '.wav',
  '.webm',
] as const;

/** `accept` attribute for the file input: known extensions + any audio/video MIME. */
export const ACCEPT_ATTR = [...ACCEPTED_EXTENSIONS, 'audio/*', 'video/*'].join(',');

/**
 * Whether a picked/dropped file is a candidate for transcription.
 *
 * Accept if the name carries a known extension OR the browser tagged it with an
 * audio/video MIME type. The MIME fallback matters for files whose name lacks a
 * usable extension — e.g. a macOS QuickTime screen recording arrives as
 * `video/quicktime` with a name like "Screen Recording" (no ".mov"). Decoding
 * still gates whether the audio is actually usable.
 */
export function isAcceptedFile(name: string, type = ''): boolean {
  const lower = name.toLowerCase();
  if (ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) return true;
  const mime = type.toLowerCase();
  return mime.startsWith('audio/') || mime.startsWith('video/');
}
