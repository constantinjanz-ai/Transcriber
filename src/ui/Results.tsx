import { memo, useRef, useState } from 'react';
import type { Caption } from '../schema/types';
import type { ValidationResult } from '../schema/validate';
import { languageLabel } from '../asr/language';

interface ResultsProps {
  transcript: Caption[];
  validation: ValidationResult;
  /** Auto-detected language code, or null (manual language / none). */
  detectedLanguage?: string | null;
  /** Base name (no extension) used for the downloaded files. */
  baseName: string;
  onDownload: (format: 'json' | 'srt' | 'vtt' | 'txt') => void;
  /** Commit an edit to a single token's text. */
  onEditToken?: (index: number, text: string) => void;
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** One word: click to edit, Enter/blur commits, Esc cancels. */
const EditableToken = memo(function EditableToken({
  index,
  text,
  onCommit,
}: {
  index: number;
  text: string;
  onCommit: (index: number, text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const cancelled = useRef(false);

  if (!editing) {
    return (
      <span
        className="token token--editable"
        role="button"
        tabIndex={0}
        title="Click to edit"
        onClick={() => setEditing(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setEditing(true);
          }
        }}
      >
        {text}
      </span>
    );
  }

  return (
    <input
      className="token-input"
      autoFocus
      defaultValue={text}
      size={Math.max(text.trim().length + 1, 3)}
      onBlur={(e) => {
        if (cancelled.current) {
          cancelled.current = false;
        } else {
          onCommit(index, e.currentTarget.value);
        }
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
    />
  );
});

export function Results({
  transcript,
  validation,
  detectedLanguage,
  baseName,
  onDownload,
  onEditToken,
}: ResultsProps) {
  const durationMs = transcript.length ? transcript[transcript.length - 1].endMs : 0;

  return (
    <section className="results">
      <header className="results__header">
        <h2>Transcript ready</h2>
        <p className="results__meta">
          {transcript.length} words · {formatDuration(durationMs)} duration
          {detectedLanguage ? ` · detected: ${languageLabel(detectedLanguage)}` : ''}
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
          Download {baseName}.json
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

      {onEditToken && (
        <p className="results__hint">
          Click any word to fix it — edits are included in every download. (Cmd/Ctrl+F to
          find a word.)
        </p>
      )}

      <div className="results__preview" aria-label="Transcript (click a word to edit)">
        {transcript.map((cap, i) =>
          onEditToken ? (
            <EditableToken key={i} index={i} text={cap.text} onCommit={onEditToken} />
          ) : (
            <span key={i} className="token" title={`${cap.startMs}–${cap.endMs} ms`}>
              {cap.text}
            </span>
          ),
        )}
      </div>
    </section>
  );
}
