import type { TranscribeProgress } from '../transcribe';

interface ProgressProps {
  status: string;
  /** 0-100 overall model download progress, or null when not downloading. */
  modelPercent: number | null;
  transcribe: TranscribeProgress | null;
}

function formatEta(seconds: number | null): string {
  if (seconds == null) return 'estimating…';
  if (seconds < 1) return 'almost done';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `~${mins}m ${secs}s left` : `~${secs}s left`;
}

function Bar({ percent }: { percent: number }) {
  return (
    <div
      className="bar"
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="bar__fill"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

export function Progress({ status, modelPercent, transcribe }: ProgressProps) {
  const transcribePercent =
    transcribe && transcribe.chunkCount > 0
      ? (transcribe.chunkIndex / transcribe.chunkCount) * 100
      : null;

  return (
    <div className="progress" aria-live="polite">
      <p className="progress__status">{status}</p>

      {modelPercent != null && (
        <div className="progress__row">
          <span className="progress__label">Model download</span>
          <Bar percent={modelPercent} />
          <span className="progress__value">{Math.round(modelPercent)}%</span>
        </div>
      )}

      {transcribe && (
        <div className="progress__row">
          <span className="progress__label">
            Chunk {transcribe.chunkIndex} / {transcribe.chunkCount}
          </span>
          {transcribePercent != null && <Bar percent={transcribePercent} />}
          <span className="progress__value">
            {transcribe.wordCount} words · {formatEta(transcribe.etaSeconds)}
          </span>
        </div>
      )}
    </div>
  );
}
