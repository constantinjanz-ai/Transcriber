import { useCallback, useMemo, useRef, useState } from 'react';
import { Dropzone } from './ui/Dropzone';
import { EngineControls } from './ui/EngineControls';
import { ModelControls } from './ui/ModelControls';
import { Progress } from './ui/Progress';
import { Results } from './ui/Results';
import { PrivacyNote } from './ui/PrivacyNote';
import { WhisperClient } from './asr/whisperClient';
import { defaultEngine, defaultDtype, type Engine } from './asr/device';
import { DEFAULT_ENGINE_CONFIG, modelId, type EngineConfig } from './asr/models';
import { transcribeFile, type TranscribeProgress } from './transcribe';
import { validateTranscript, type ValidationResult } from './schema/validate';
import { transcriptToJson, downloadText } from './export/json';
import { downloadBaseName } from './export/filename';
import { transcriptToSrt } from './export/srt';
import { transcriptToVtt } from './export/vtt';
import { transcriptToText } from './export/txt';
import type { Caption } from './schema/types';
import { AudioDecodeError } from './audio/decode';

type Phase = 'idle' | 'loading' | 'transcribing' | 'done' | 'error';

export function App() {
  const [file, setFile] = useState<File | null>(null);
  const [engine, setEngine] = useState<Engine>(() => defaultEngine());
  const [config, setConfig] = useState<EngineConfig>(DEFAULT_ENGINE_CONFIG);

  const [phase, setPhase] = useState<Phase>('idle');
  const [status, setStatus] = useState('');
  const [modelPercent, setModelPercent] = useState<number | null>(null);
  const [transcribeProgress, setTranscribeProgress] = useState<TranscribeProgress | null>(
    null,
  );
  const [transcript, setTranscript] = useState<Caption[] | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<WhisperClient | null>(null);
  // Per-file download bytes, used to compute an aggregate model-download percent.
  const downloadBytes = useRef<Map<string, { loaded: number; total: number }>>(new Map());

  const validation: ValidationResult | null = useMemo(
    () => (transcript ? validateTranscript(transcript) : null),
    [transcript],
  );

  const busy = phase === 'loading' || phase === 'transcribing';

  const start = useCallback(async () => {
    if (!file || busy) return;

    setError(null);
    setPhase('loading');
    setStatus('Loading model…');
    setModelPercent(0);
    setTranscribeProgress(null);
    setDetectedLanguage(null);
    downloadBytes.current.clear();

    if (!clientRef.current) clientRef.current = new WhisperClient();
    const client = clientRef.current;

    try {
      await client.load(
        modelId(config.size, config.mode),
        engine,
        defaultDtype(engine),
        (p) => {
          if (p.file && typeof p.loaded === 'number' && typeof p.total === 'number') {
            downloadBytes.current.set(p.file, { loaded: p.loaded, total: p.total });
          }
          let loaded = 0;
          let total = 0;
          for (const v of downloadBytes.current.values()) {
            loaded += v.loaded;
            total += v.total;
          }
          setModelPercent(total > 0 ? (loaded / total) * 100 : 0);
          setStatus(p.status === 'ready' ? 'Model ready' : 'Downloading model…');
        },
      );

      setModelPercent(null);
      setPhase('transcribing');

      const result = await transcribeFile(file, client, config, {
        onStatus: setStatus,
        onProgress: setTranscribeProgress,
        onLanguageDetected: setDetectedLanguage,
      });

      // Guarantee the output honors the frozen contract before we hand it over.
      const { valid, errors } = validateTranscript(result);
      if (!valid) {
        // Still surface the transcript so work isn't lost, but warn loudly.
        console.error('Transcript failed validation:', errors);
      }

      setTranscript(result);
      setStatus(`Done — ${result.length} words.`);
      setPhase('done');
    } catch (err) {
      const message = describeError(err, engine);
      setError(message);
      setStatus('');
      setModelPercent(null);
      // Note: we intentionally keep any previously completed transcript in state.
      setPhase('error');
    }
  }, [file, busy, config, engine]);

  const handleDownload = useCallback(
    (format: 'json' | 'srt' | 'vtt' | 'txt') => {
      if (!transcript) return;
      // Name exports after the uploaded file so multiple runs stay distinguishable.
      const base = downloadBaseName(file?.name);
      if (format === 'json') {
        downloadText(transcriptToJson(transcript), `${base}.json`, 'application/json');
      } else if (format === 'srt') {
        downloadText(transcriptToSrt(transcript), `${base}.srt`, 'text/plain');
      } else if (format === 'vtt') {
        downloadText(transcriptToVtt(transcript), `${base}.vtt`, 'text/vtt');
      } else {
        downloadText(transcriptToText(transcript), `${base}.txt`, 'text/plain');
      }
    },
    [transcript, file],
  );

  return (
    <main className="app">
      <header className="app__header">
        <h1>Webinar Transcriber</h1>
        <p className="app__tagline">
          Word-level <code>transcript.json</code>, generated locally in your browser.
        </p>
      </header>

      <PrivacyNote />

      <Dropzone
        file={file}
        disabled={busy}
        onFile={(f) => {
          setFile(f);
          setError(null);
        }}
        onReject={(msg) => {
          setError(msg);
          setPhase('error');
        }}
      />

      <div className="controls">
        <EngineControls engine={engine} disabled={busy} onChange={setEngine} />
        <ModelControls config={config} disabled={busy} onChange={setConfig} />
      </div>

      <button
        className="btn btn--primary btn--lg"
        disabled={!file || busy}
        onClick={start}
      >
        {busy ? 'Working…' : 'Transcribe'}
      </button>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      {busy && (
        <Progress
          status={status}
          modelPercent={modelPercent}
          transcribe={transcribeProgress}
        />
      )}

      {transcript && validation && (
        <Results
          transcript={transcript}
          validation={validation}
          detectedLanguage={detectedLanguage}
          baseName={downloadBaseName(file?.name)}
          onDownload={handleDownload}
        />
      )}

      <footer className="app__footer">
        Whisper via transformers.js · models from Hugging Face ·{' '}
        <a href="https://github.com/" target="_blank" rel="noreferrer">
          source &amp; docs
        </a>
      </footer>
    </main>
  );
}

function describeError(err: unknown, engine: Engine): string {
  if (err instanceof AudioDecodeError) return err.message;
  const message = err instanceof Error ? err.message : String(err);
  if (engine === 'webgpu') {
    return (
      `WebGPU failed to initialize (${message}). ` +
      'Try switching the engine to WASM (CPU) above and transcribing again.'
    );
  }
  return `Transcription failed: ${message}`;
}
