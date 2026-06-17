import {
  MODEL_SIZES,
  MODEL_SIZE_INFO,
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
  const isEnglishOnly = config.mode === 'english';

  return (
    <fieldset className="control" disabled={disabled}>
      <legend>Model</legend>
      <div className="control__body">
        <label className="field">
          <span>Size</span>
          <select
            value={config.size}
            onChange={(e) => onChange({ ...config, size: e.target.value as ModelSize })}
          >
            {MODEL_SIZES.map((size) => (
              <option key={size} value={size}>
                {MODEL_SIZE_INFO[size].label} ({MODEL_SIZE_INFO[size].approxDownload})
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Language mode</span>
          <select
            value={config.mode}
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
