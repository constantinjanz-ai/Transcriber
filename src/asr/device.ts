/** Engine (compute backend) selection: WebGPU preferred, WASM fallback. */

export type Engine = 'webgpu' | 'wasm';

/** transformers.js `dtype` quantization per model component. */
export type Dtype = string | Record<string, string>;

/**
 * Whether WebGPU is usable in the current environment. We only check for the
 * API surface here; actual device init can still fail at load time, in which
 * case the UI surfaces the error and suggests switching to WASM.
 */
export function isWebGpuAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator && !!navigator.gpu;
}

/** Auto-pick the best available engine. */
export function defaultEngine(): Engine {
  return isWebGpuAvailable() ? 'webgpu' : 'wasm';
}

/**
 * Sensible default quantization per engine.
 *  - WebGPU: fp16 — fast and memory-light on the GPU.
 *  - WASM:   q8  — quantized for smaller download and acceptable CPU speed.
 * These can be overridden per call if needed.
 */
export function defaultDtype(engine: Engine): Dtype {
  return engine === 'webgpu' ? 'fp16' : 'q8';
}

export const ENGINE_LABELS: Record<Engine, string> = {
  webgpu: 'WebGPU (GPU)',
  wasm: 'WASM (CPU)',
};
