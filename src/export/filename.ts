/**
 * Derive a download base name from an uploaded file name: drop the directory and
 * the last extension, so `1000141473.mp4` → `1000141473` and exports become
 * `1000141473.json` etc. Falls back to `"transcript"` when there's nothing usable.
 *
 * Pure (no DOM), so it's unit-testable in node.
 */
export function downloadBaseName(fileName: string | null | undefined): string {
  const name = (fileName ?? '').split(/[\\/]/).pop() ?? '';
  const stem = name.replace(/\.[^.]+$/, '').trim();
  return stem || 'transcript';
}
