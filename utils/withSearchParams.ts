/**
 * Append query keys to a path, keeping any query already present.
 * Skips null/undefined values.
 */
export function withSearchParams(
  href: string,
  params: Record<string, string | number | boolean | null | undefined>
): string {
  const qIndex = href.indexOf('?');
  const path = qIndex >= 0 ? href.slice(0, qIndex) : href;
  const existing = qIndex >= 0 ? href.slice(qIndex + 1) : '';
  const search = new URLSearchParams(existing);

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    search.set(key, String(value));
  }

  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}
