import type { Caption } from '../schema/types';
import { groupIntoCues, formatTimestamp } from './cues';

/** Render captions as a SubRip (.srt) subtitle file. */
export function transcriptToSrt(captions: Caption[]): string {
  const cues = groupIntoCues(captions);
  return (
    cues
      .map((cue, i) => {
        const start = formatTimestamp(cue.startMs, ',');
        const end = formatTimestamp(cue.endMs, ',');
        return `${i + 1}\n${start} --> ${end}\n${cue.text}\n`;
      })
      .join('\n') + '\n'
  );
}
