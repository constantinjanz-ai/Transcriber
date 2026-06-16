import type { Transcript } from '../schema/types';

/** Serialize the transcript to the contract JSON string. */
export function transcriptToJson(transcript: Transcript): string {
  return JSON.stringify(transcript, null, 2);
}

/** Trigger a browser download of `content` as `filename`. */
export function downloadText(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
