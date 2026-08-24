/**
 * Shared pathname matching for EditionTabsBar and breadcrumb tab labels.
 */

import type { EditionTabLink } from '@/components/editions/EditionTabsBar';

export function isEditionTabActive(
  pathname: string,
  match: string,
  matchExact = false
): boolean {
  const segment = match.replace(/^\/+|\/+$/g, '');
  if (!segment) return false;
  const parts = pathname.split('/').filter(Boolean);
  if (matchExact) {
    return parts[parts.length - 1] === segment;
  }
  return parts.includes(segment);
}

export function findActiveEditionTabLabel(
  pathname: string,
  tabs: EditionTabLink[]
): string | null {
  for (const tab of tabs) {
    if (tab.onPress) continue;
    if (isEditionTabActive(pathname, tab.match, tab.matchExact)) {
      return tab.label;
    }
  }
  return null;
}
