import {
  MODEL_SIZES,
  MODEL_SIZE_INFO,
  MULTILINGUAL_ONLY_SIZES,
  LANGUAGES,
  type EngineConfig,
  type LanguageMode,
  type ModelSize,
} from '../asr/models';

interface ModelControlsProps {
  config: EngineConfig;
  disabled: boolean;
  onChange: (config: EngineConfig) => void;
}

export function ModelControls({ config, disabled, onChange }: ModelControlsProps) {
  const isMultilingualOnly = MULTILINGUAL_ONLY_SIZES.includes(config.size);
  const isEnglishOnly = config.mode === 'english' && !isMultilingualOnly;

  return (
    <fieldset className="control" disabled={disabled}>
      <legend>Model</legend>
      <div className="control__body">
        <label className="field">
          <span>Size</span>
          <select
            value={config.size}
            onChange={(e) => {
              const size = e.target.value as ModelSize;
              // Multilingual-only sizes (turbo) have no .en variant — force the mode.
              const mode = MULTILINGUAL_ONLY_SIZES.includes(size)
                ? 'multilingual'
                : config.mode;
              onChange({ ...config, size, mode });
            }}
          >
            {MODEL_SIZES.map((size) => (
              <option key={size} value={size}>
                {MODEL_SIZE_INFO[size].label} ({MODEL_SIZE_INFO[size].approxDownload})
              </option>
            ))}
          </select>
          {config.size === 'turbo' && (
            <small className="control__hint">
              Most accurate. Large one-time download (~0.8 GB) and slower on CPU;
              multilingual only.
            </small>
          )}
        </label>

        <label className="field">
          <span>Language mode</span>
          <select
            value={isMultilingualOnly ? 'multilingual' : config.mode}
            disabled={isMultilingualOnly}
            onChange={(e) => {
              const mode = e.target.value as LanguageMode;
              // English-only models can't take a language override.
              onChange({
                ...config,
                mode,
                language: mode === 'english' ? '' : config.language,
              });
            }}
          >
            <option value="multilingual">Multilingual (auto-detect + picker)</option>
            <option value="english">English-optimized (.en)</option>
          </select>
        </label>

        <label className="field">
          <span>Language</span>
          <select
            value={config.language}
            disabled={isEnglishOnly}
            onChange={(e) => onChange({ ...config, language: e.target.value })}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code || 'auto'} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
          {isEnglishOnly && (
            <small className="control__hint">
              English-optimized model is English-only.
            </small>
          )}
        </label>
      </div>
    </fieldset>
  );
}
