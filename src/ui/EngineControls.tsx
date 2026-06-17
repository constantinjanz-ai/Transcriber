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
      <div className="control__body">
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
          <strong>WASM (CPU) is the recommended, reliable engine</strong> for word-level
          timestamps and is the default. WebGPU is faster but its word-timestamp support
          is limited — if it errors, switch back to WASM.
        </p>
      </div>
    </fieldset>
  );
}
