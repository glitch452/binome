/**
 * Triggers a browser download of `data` serialized as pretty-printed JSON.
 *
 * Creates a transient `Blob` → object URL → `<a download>` click → revoke.
 * SSR-safe: no-ops when `window` is not available.
 * @param filename - The suggested filename for the download.
 * @param data - The value to serialize; passed to `JSON.stringify` with 2-space indent.
 */
const JSON_INDENT = 2;

export function downloadJson(filename: string, data: unknown): void {
  if (typeof window === 'undefined') {
    return;
  }
  const json = JSON.stringify(data, null, JSON_INDENT);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
