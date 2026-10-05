/**
 * Shared pathname matching for EventTabsBar and breadcrumb tab labels.
 */

import type { EventTabLink } from '@/components/events/EventTabsBar';

export function isEventTabActive(
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

export function findActiveEventTabLabel(
  pathname: string,
  tabs: EventTabLink[]
): string | null {
  for (const tab of tabs) {
    if (tab.onPress) continue;
    if (isEventTabActive(pathname, tab.match, tab.matchExact)) {
      return tab.label;
    }
  }
  return null;
}
