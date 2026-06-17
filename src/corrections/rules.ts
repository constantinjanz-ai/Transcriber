/**
 * Editable domain glossary for fixing Whisper mis-transcriptions of brand names
 * and jargon. **This is the file the team edits to add terms.**
 *
 * Each rule maps a `canonical` spelling (output verbatim, with its exact casing)
 * to the `variants` Whisper tends to produce instead. A variant may be one word
 * ("grok") or several ("chat GPT") — `applyCorrections` figures that out:
 *   - one-word variants  → single-token replacements,
 *   - multi-word variants → consecutive tokens merged into one.
 *
 * `risky` variants are real words/names with legitimate other meanings
 * (e.g. "peak", "Mike", "roofers", "Miter"). They only fire when corrections run
 * with `includeRisky: true` (the default in this Peec-brand tool — see
 * applyCorrections). Move a variant to `risky` if it ever over-corrects.
 *
 * Matching is case-insensitive and whole-word; surrounding punctuation and the
 * leading space Whisper emits are preserved.
 */
export interface CorrectionRule {
  canonical: string;
  /** Always-on variants. */
  variants: string[];
  /** Opt-in variants (real words/names) — only when includeRisky is true. */
  risky?: string[];
}

export const CORRECTION_RULES: CorrectionRule[] = [
  // --- ChatGPT (longest "shopping" phrases first so they win the merge) ---
  {
    canonical: 'ChatGPT Shopping',
    variants: ['ChatGPT shopping', 'chat GPT shopping', 'charge GPT shopping'],
  },
  {
    canonical: 'ChatGPT',
    variants: [
      'chat GPT',
      'chatGPT',
      'charge GPT',
      'change GPT',
      'chat to be',
      'Chetupiti',
      'Chetupi T',
      'Ted CPT',
      'Chachably',
      'Chate BT',
      'JHPT',
      'CHHBT',
      'chat GBT',
      'chatupiti',
    ],
    risky: ['Judge B'],
  },

  // --- Peec / Peec AI ---
  {
    canonical: 'Peec AI',
    variants: [],
    risky: ['peak AI'],
  },
  {
    canonical: 'Peec',
    variants: ['Pika', 'PKI', 'Pico', 'Pik', 'PIG', 'PIK', 'PEG'],
    risky: ['peak'],
  },

  // --- Jargon / acronyms ---
  { canonical: 'GEO', variants: ['geo', 'G E O', 'G.O.'] },
  { canonical: 'AEO', variants: ['A E O'], risky: ['AO'] },
  {
    canonical: 'llms.txt',
    variants: ['llms text', 'LLM .txt', 'llm txt', 'llms dot txt'],
  },
  { canonical: 'agents.md', variants: ['agents MD', "agent's MD", 'agents dot md'] },
  { canonical: 'LLMs', variants: ["LLM's", 'LLM s', 'llms'] },
  { canonical: 'fan-out', variants: ['fan art', 'fanart', 'fan-art', 'fan out'] },
  { canonical: 'AI Overviews', variants: ['AI overview', 'AI overviews'] },
  { canonical: 'AI mode', variants: ['AI mode'] },
  { canonical: 'schema markup', variants: ['schema mark up'] },
  { canonical: 'structured data', variants: ['structured data'] },
  { canonical: 'agentic', variants: ['a Gentic', 'agentic'] },

  // --- Products / companies ---
  {
    canonical: 'Perplexity',
    variants: ['perplexity', 'perplexed city'],
    risky: ['roofers'],
  },
  { canonical: 'Gemini', variants: ['gemini'] },
  { canonical: 'Grok', variants: ['grok'], risky: ['grog'] },
  { canonical: 'Copilot', variants: ['co-pilot', 'copilot'] },
  {
    canonical: 'Google Merchant Center',
    variants: ['google merchant center', 'merchant centre'],
  },
  { canonical: 'Shopify', variants: ['shopify'] },
  { canonical: 'Claneo', variants: ['Clane', 'Claneal', 'Clan e o'] },

  // --- People ---
  {
    canonical: 'Malte Landwehr',
    variants: ['Maita', 'Mylta', 'Malta Landwehr'],
    risky: ['Miter', 'Mike'],
  },
];

/**
 * Layer 1 glossary used to bias Whisper recognition (passed as the generation
 * prompt). Editable — keep it a comma-separated run of the key vocabulary.
 */
export const DOMAIN_PROMPT =
  'Peec AI webinar on GEO (generative engine optimization), AEO, AI search, ' +
  'ChatGPT Shopping, AI Overviews, AI mode, LLMs, llms.txt, agents.md, fan-out queries, ' +
  'grounding, schema markup, structured data, share of voice, citations, retrieval, ' +
  'Perplexity, Gemini, Grok, Copilot, Google Merchant Center, Shopify, Claneo, ESN, ' +
  'Revolut, Linear, Malte Landwehr.';
