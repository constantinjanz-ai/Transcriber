import type { Caption } from '../schema/types';
import { CORRECTION_RULES, type CorrectionRule } from './rules';

export interface CorrectionOptions {
  /**
   * Apply the `risky` variants (real words/names like "peak", "Mike", "roofers").
   * Defaults to true — this is the Peec-brand tool, so brand context is assumed.
   * Set false to run only the always-on, low-risk fixes.
   */
  includeRisky?: boolean;
  /** Rules to use; defaults to the shipped glossary. */
  rules?: CorrectionRule[];
}

const round = Math.round;

/** Strip a leading space + opening punctuation, the core, and trailing punctuation. */
function splitAffixes(text: string): { lead: string; core: string; trail: string } {
  const m = /^(\s*[^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u.exec(text);
  if (!m) return { lead: '', core: text, trail: '' };
  return { lead: m[1], core: m[2], trail: m[3] };
}

/** Normalize a word for matching: lower-case, drop outer (not inner) punctuation. */
function norm(word: string): string {
  return word
    .trim()
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/[^\p{L}\p{N}]+$/u, '');
}

interface CompiledRules {
  /** normalized single word -> canonical */
  single: Map<string, string>;
  /** normalized multi-word phrase -> { canonical, length } */
  phrases: Map<string, { canonical: string; length: number }>;
  maxPhraseLen: number;
}

function compile(rules: CorrectionRule[], includeRisky: boolean): CompiledRules {
  const single = new Map<string, string>();
  const phrases = new Map<string, { canonical: string; length: number }>();
  let maxPhraseLen = 1;

  for (const rule of rules) {
    const variants = includeRisky
      ? [...rule.variants, ...(rule.risky ?? [])]
      : rule.variants;
    for (const variant of variants) {
      const words = variant.trim().split(/\s+/).map(norm).filter(Boolean);
      if (words.length === 0) continue;
      if (words.length === 1) {
        single.set(words[0], rule.canonical);
      } else {
        phrases.set(words.join(' '), { canonical: rule.canonical, length: words.length });
        maxPhraseLen = Math.max(maxPhraseLen, words.length);
      }
    }
  }
  return { single, phrases, maxPhraseLen };
}

function mergeTokens(tokens: Caption[], canonical: string): Caption {
  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  const { lead } = splitAffixes(first.text);
  const { trail } = splitAffixes(last.text);
  const confidences = tokens
    .map((t) => t.confidence)
    .filter((c): c is number => c != null);
  const startMs = first.startMs;
  const endMs = last.endMs;
  return {
    text: `${lead}${canonical}${trail}`,
    startMs,
    endMs,
    timestampMs: round((startMs + endMs) / 2),
    confidence: confidences.length ? Math.min(...confidences) : null,
    isSentenceEnd: last.isSentenceEnd,
  };
}

/**
 * Deterministic post-correction over transcript tokens. Phrase (multi-token)
 * rules run first — consecutive tokens whose joined words match a variant are
 * merged into one canonical token (timing preserved: start of first → end of
 * last). Then single-token rules replace whole-word matches in place. The output
 * keeps the frozen contract and monotonic timestamps.
 */
export function applyCorrections(
  tokens: Caption[],
  options: CorrectionOptions = {},
): Caption[] {
  const includeRisky = options.includeRisky ?? true;
  const { single, phrases, maxPhraseLen } = compile(
    options.rules ?? CORRECTION_RULES,
    includeRisky,
  );

  // --- Pass 1: phrase merges (longest match wins at each position) ---
  const merged: Caption[] = [];
  for (let i = 0; i < tokens.length; ) {
    let matched = false;
    const maxLen = Math.min(maxPhraseLen, tokens.length - i);
    for (let len = maxLen; len >= 2; len--) {
      const window = tokens.slice(i, i + len);
      const key = window.map((t) => norm(t.text)).join(' ');
      const hit = phrases.get(key);
      if (hit && hit.length === len) {
        merged.push(mergeTokens(window, hit.canonical));
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      merged.push(tokens[i]);
      i += 1;
    }
  }

  // --- Pass 2: single-token replacements (preserve space + punctuation) ---
  return merged.map((token) => {
    const { lead, core, trail } = splitAffixes(token.text);
    const canonical = single.get(norm(core));
    if (!canonical) return token;
    return { ...token, text: `${lead}${canonical}${trail}` };
  });
}
