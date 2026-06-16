import type { Caption } from '../schema/types';
import { groupIntoCues, formatTimestamp } from './cues';

/** Render captions as a WebVTT (.vtt) subtitle file. */
export function transcriptToVtt(captions: Caption[]): string {
  const cues = groupIntoCues(captions);
  const body = cues
    .map((cue) => {
      const start = formatTimestamp(cue.startMs, '.');
      const end = formatTimestamp(cue.endMs, '.');
      return `${start} --> ${end}\n${cue.text}\n`;
    })
    .join('\n');
  return `WEBVTT\n\n${body}`;
}
