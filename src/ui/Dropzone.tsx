import { useCallback, useRef, useState } from 'react';

export const ACCEPTED_EXTENSIONS = [
  '.mp4',
  '.mov',
  '.m4a',
  '.mp3',
  '.wav',
  '.webm',
] as const;

export function isAcceptedFile(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

interface DropzoneProps {
  file: File | null;
  disabled: boolean;
  onFile: (file: File) => void;
  onReject: (message: string) => void;
}

export function Dropzone({ file, disabled, onFile, onReject }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const picked = files?.[0];
      if (!picked) return;
      if (!isAcceptedFile(picked.name)) {
        onReject(
          `Unsupported file type. Please choose one of: ${ACCEPTED_EXTENSIONS.join(', ')}.`,
        );
        return;
      }
      onFile(picked);
    },
    [onFile, onReject],
  );

  return (
    <div
      className={`dropzone${dragging ? ' dropzone--active' : ''}${
        disabled ? ' dropzone--disabled' : ''
      }`}
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label="Choose or drop an audio or video file"
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(',')}
        hidden
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="winbar" aria-hidden="true">
        <span className="winbar__dots">
          <i className="winbar__dot winbar__dot--accent" />
          <i className="winbar__dot" />
          <i className="winbar__dot" />
        </span>
        <span className="winbar__label">UPLOAD</span>
      </div>
      <div className="dropzone__target">
        <p className="dropzone__title">
          {file ? file.name : 'Drop an audio or video file here'}
        </p>
        <p className="dropzone__hint">
          {file
            ? `${(file.size / 1_000_000).toFixed(1)} MB — click to choose a different file`
            : `Click to browse · ${ACCEPTED_EXTENSIONS.join('  ')}`}
        </p>
      </div>
    </div>
  );
}
