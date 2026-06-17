import { describe, it, expect } from 'vitest';
import { downloadBaseName } from '../src/export/filename';

describe('downloadBaseName', () => {
  it('drops the extension from the uploaded file name', () => {
    expect(downloadBaseName('1000141473.mp4')).toBe('1000141473');
    expect(downloadBaseName('Weekly Webinar.m4a')).toBe('Weekly Webinar');
  });

  it('only strips the last extension', () => {
    expect(downloadBaseName('webinar.2024.mov')).toBe('webinar.2024');
  });

  it('strips any directory path', () => {
    expect(downloadBaseName('/Users/me/Downloads/talk.wav')).toBe('talk');
    expect(downloadBaseName('C:\\videos\\talk.webm')).toBe('talk');
  });

  it('handles names without an extension', () => {
    expect(downloadBaseName('recording')).toBe('recording');
  });

  it('falls back to "transcript" for empty/missing input', () => {
    expect(downloadBaseName('')).toBe('transcript');
    expect(downloadBaseName(null)).toBe('transcript');
    expect(downloadBaseName(undefined)).toBe('transcript');
    expect(downloadBaseName('.mp4')).toBe('transcript');
  });
});
