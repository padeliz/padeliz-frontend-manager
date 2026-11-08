/**
 * Whether staging/web builds should emit robots noindex.
 * Baked via EXPO_PUBLIC_NOINDEX at Docker image build time.
 * Manager is never search-indexable in deployed envs.
 */
export const NOINDEX_ROBOTS_CONTENT =
  'noindex, nofollow, noarchive, nosnippet, noimageindex';

export function shouldNoindex(): boolean {
  const raw = process.env.EXPO_PUBLIC_NOINDEX?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function robotsMetaContent(): string | null {
  return shouldNoindex() ? NOINDEX_ROBOTS_CONTENT : null;
}
