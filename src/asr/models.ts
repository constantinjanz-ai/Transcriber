/** Model + language registry for the Whisper ASR engine. */

export type ModelSize = 'tiny' | 'base' | 'small' | 'turbo';
export type LanguageMode = 'english' | 'multilingual';

export const MODEL_SIZES: ModelSize[] = ['tiny', 'base', 'small', 'turbo'];

/** Sizes that have no English-only (`.en`) variant — multilingual only. */
export const MULTILINGUAL_ONLY_SIZES: ModelSize[] = ['turbo'];

/** Rough on-disk download sizes (q8/fp16) to set user expectations in the UI. */
export const MODEL_SIZE_INFO: Record<
  ModelSize,
  { label: string; approxDownload: string }
> = {
  tiny: { label: 'Tiny', approxDownload: '~75 MB' },
  base: { label: 'Base', approxDownload: '~145 MB' },
  small: { label: 'Small', approxDownload: '~485 MB' },
  turbo: { label: 'Large v3 Turbo', approxDownload: '~0.8 GB' },
};

/**
 * Build the onnx-community repo id for a given size + language mode.
 *
 * We use the `_timestamped` exports specifically: they include the decoder
 * cross-attention outputs that `return_timestamps: 'word'` needs. The standard
 * `whisper-*` exports omit those, which fails with "Model outputs must contain
 * cross attentions to extract timestamps."
 *
 * English-optimized models add `.en`, EXCEPT sizes with no English-only variant
 * (e.g. `turbo`), which are multilingual-only and use a distinct repo name.
 */
export function modelId(size: ModelSize, mode: LanguageMode): string {
  if (size === 'turbo') {
    return 'onnx-community/whisper-large-v3-turbo_timestamped';
  }
  const lang = mode === 'english' ? '.en' : '';
  return `onnx-community/whisper-${size}${lang}_timestamped`;
}

export interface LanguageOption {
  /** Whisper language code, e.g. "en". */
  code: string;
  label: string;
}

/**
 * Languages offered in the manual picker. `auto` (empty code) lets multilingual
 * Whisper detect the language itself. English and German are required for Peec's
 * webinars; the rest are a convenient common subset.
 */
export const AUTO_DETECT: LanguageOption = { code: '', label: 'Auto-detect' };

export const LANGUAGES: LanguageOption[] = [
  AUTO_DETECT,
  { code: 'en', label: 'English' },
  { code: 'de', label: 'German' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'it', label: 'Italian' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'pl', label: 'Polish' },
  { code: 'ru', label: 'Russian' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'tr', label: 'Turkish' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ko', label: 'Korean' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
];

export interface EngineConfig {
  size: ModelSize;
  mode: LanguageMode;
  /** Whisper language code, or '' for auto-detect (multilingual only). */
  language: string;
}

/** Spec default: multilingual base with auto-detect. */
export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  size: 'base',
  mode: 'multilingual',
  language: '',
};
