import { describe, it, expect } from 'vitest';
import { isAcceptedFile } from '../src/ui/accept';

describe('isAcceptedFile', () => {
  it('accepts known extensions (case-insensitive)', () => {
    expect(isAcceptedFile('webinar.mov')).toBe(true);
    expect(isAcceptedFile('webinar.MOV')).toBe(true);
    expect(isAcceptedFile('talk.mp4')).toBe(true);
    expect(isAcceptedFile('audio.m4a')).toBe(true);
  });

  it('accepts extension-less files by audio/video MIME type', () => {
    // macOS QuickTime screen recording: no ".mov" in the name, video/quicktime MIME.
    expect(isAcceptedFile('Screen Recording', 'video/quicktime')).toBe(true);
    expect(isAcceptedFile('voice memo', 'audio/x-m4a')).toBe(true);
    expect(isAcceptedFile('clip', 'video/mp4')).toBe(true);
  });

  it('rejects non-media files', () => {
    expect(isAcceptedFile('notes.txt', 'text/plain')).toBe(false);
    expect(isAcceptedFile('image.png', 'image/png')).toBe(false);
    expect(isAcceptedFile('archive.zip')).toBe(false);
    expect(isAcceptedFile('no-extension-no-mime')).toBe(false);
  });
});
