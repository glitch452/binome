/**
 * Reloads the current page in a cache-busting way for the no-service-worker path.
 *
 * Rebuilds the current URL with a refreshed `_` cache-bust search param (replacing
 * any existing `_` rather than stacking a second one) and navigates via
 * `location.replace`, so the stale entry document is bypassed and history is not
 * polluted. Used by `useApplyUpdate`'s no-SW branch in place of a bare
 * `window.location.reload()`. Best-effort on hosts whose cache headers we cannot
 * set; where we control headers (nginx/Docker), the entry-HTML no-cache rule is
 * the primary mechanism.
 * SSR-safe: no-ops when `window` is not available.
 */
export function cacheBustingReload(): void {
  if (typeof window === 'undefined') {
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.set('_', String(Date.now()));
  window.location.replace(url.toString());
}
