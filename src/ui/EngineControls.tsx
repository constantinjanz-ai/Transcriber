import { ENGINE_LABELS, isWebGpuAvailable, type Engine } from '../asr/device';

interface EngineControlsProps {
  engine: Engine;
  disabled: boolean;
  onChange: (engine: Engine) => void;
}

export function EngineControls({ engine, disabled, onChange }: EngineControlsProps) {
  const webgpu = isWebGpuAvailable();
  return (
    <fieldset className="control" disabled={disabled}>
      <legend>Engine</legend>
      <div className="segmented" role="radiogroup" aria-label="Compute engine">
        {(['webgpu', 'wasm'] as Engine[]).map((value) => (
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
        {webgpu
          ? 'WebGPU detected. WASM works everywhere as a fallback.'
          : 'WebGPU not detected in this browser — using WASM (CPU).'}
      </p>
    </fieldset>
  );
}
