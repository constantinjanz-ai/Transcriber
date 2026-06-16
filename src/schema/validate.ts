import Ajv2020 from 'ajv/dist/2020';
import type { ErrorObject } from 'ajv';
import schema from '../../schema/transcript.schema.json';
import type { Transcript } from './types';

const ajv = new Ajv2020({ allErrors: true });
const validateSchema = ajv.compile(schema);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a transcript against the frozen JSON Schema, plus two cross-field
 * invariants the schema language can't express on its own:
 *   - endMs >= startMs for every token
 *   - tokens are in chronological order across the whole file (global offsets)
 */
export function validateTranscript(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!validateSchema(data)) {
    for (const err of (validateSchema.errors ?? []) as ErrorObject[]) {
      errors.push(`${err.instancePath || '(root)'} ${err.message ?? 'is invalid'}`);
    }
    return { valid: false, errors };
  }

  const tokens = data as Transcript;
  let prevStart = -Infinity;
  tokens.forEach((t, i) => {
    if (t.endMs < t.startMs) {
      errors.push(`[${i}] endMs (${t.endMs}) < startMs (${t.startMs})`);
    }
    if (t.startMs < prevStart) {
      errors.push(
        `[${i}] startMs (${t.startMs}) precedes previous token (${prevStart}) — not chronological`,
      );
    }
    prevStart = t.startMs;
  });

  return { valid: errors.length === 0, errors };
}

/** Throwing wrapper for call sites that treat invalid output as a hard error. */
export function assertValidTranscript(data: unknown): asserts data is Transcript {
  const { valid, errors } = validateTranscript(data);
  if (!valid) {
    throw new Error(`transcript.json failed validation:\n${errors.join('\n')}`);
  }
}
