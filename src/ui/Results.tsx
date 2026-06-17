import type { Caption } from '../schema/types';
import type { ValidationResult } from '../schema/validate';

interface ResultsProps {
  transcript: Caption[];
  validation: ValidationResult;
  onDownload: (format: 'json' | 'srt' | 'vtt' | 'txt') => void;
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function Results({ transcript, validation, onDownload }: ResultsProps) {
  const durationMs = transcript.length ? transcript[transcript.length - 1].endMs : 0;
  const preview = transcript.slice(0, 60);

  return (
    <section className="results">
      <header className="results__header">
        <h2>Transcript ready</h2>
        <p className="results__meta">
          {transcript.length} words · {formatDuration(durationMs)} duration
        </p>
      </header>

      <p
        className={`badge ${validation.valid ? 'badge--ok' : 'badge--error'}`}
        role="status"
      >
        {validation.valid
          ? '✓ Validates against transcript.schema.json'
          : `✗ Failed schema validation (${validation.errors.length} issue(s))`}
      </p>
      {!validation.valid && (
        <ul className="results__errors">
          {validation.errors.slice(0, 5).map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      <div className="results__actions">
        <button className="btn btn--primary" onClick={() => onDownload('json')}>
          Download transcript.json
        </button>
        <button className="btn" onClick={() => onDownload('txt')}>
          .txt
        </button>
        <button className="btn" onClick={() => onDownload('srt')}>
          .srt
        </button>
        <button className="btn" onClick={() => onDownload('vtt')}>
          .vtt
        </button>
      </div>

      <div className="results__preview" aria-label="Transcript preview">
        {preview.map((cap, i) => (
          <span key={i} className="token" title={`${cap.startMs}–${cap.endMs} ms`}>
            {cap.text}
          </span>
        ))}
        {transcript.length > preview.length && (
          <span className="token token--more">…</span>
        )}
      </div>
    </section>
  );
}
