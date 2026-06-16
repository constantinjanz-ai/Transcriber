import { ENGINE_LABELS, type Engine } from '../asr/device';

interface EngineControlsProps {
  engine: Engine;
  disabled: boolean;
  onChange: (engine: Engine) => void;
}

export function EngineControls({ engine, disabled, onChange }: EngineControlsProps) {
  return (
    <fieldset className="control" disabled={disabled}>
      <legend>Engine</legend>
      <div className="segmented" role="radiogroup" aria-label="Compute engine">
        {(['wasm', 'webgpu'] as Engine[]).map((value) => (
          <label key={value} className="segmented__option">
            <input
              type="radio"
              name="engine"
              value={value}
              checked={engine === value}
              onChange={() => onChange(value)}
            />
            <span>{ENGINE_LABELS[value]}</span>
          </label>
        ))}
      </div>
      <p className="control__hint">
        <strong>WASM (CPU) is required for word-level timestamps</strong> and is the
        default. WebGPU is faster but cannot return word timestamps yet (a
        transformers.js limitation), so it will error on this tool&rsquo;s output.
      </p>
    </fieldset>
  );
}
