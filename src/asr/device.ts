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

/**
 * Default engine.
 *
 * This tool's core output is WORD-LEVEL timestamps, which require the decoder's
 * cross-attention outputs. transformers.js only exposes those on the WASM
 * backend — WebGPU word-level timestamps are not yet supported
 * (https://github.com/huggingface/transformers.js/issues/820). So we default to
 * WASM. WebGPU stays available via the toggle for the faster non-timestamp path,
 * but it will error on word timestamps.
 */
export function defaultEngine(): Engine {
  return 'wasm';
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
