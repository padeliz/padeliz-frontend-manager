/**
 * Flat sidebar CRUD breadcrumb trails.
 */

import type { BreadcrumbItem } from '@/components/layout/Breadcrumbs';

export type BuildResourceBreadcrumbsOptions = {
  sectionLabel: string;
  sectionHref: string;
  /** When omitted, trail is section-only (list). */
  leaf?: string | null;
  /** When true and leaf set, leaf is "Add" style under section (leaf may be "Add"). */
  leafHref?: never;
};

/**
 * @param leaf - omit/null for list; string for add/view current segment (no href)
 */
export function buildResourceBreadcrumbs({
  sectionLabel,
  sectionHref,
  leaf,
}: {
  sectionLabel: string;
  sectionHref: string;
  leaf?: string | null;
}): BreadcrumbItem[] {
  if (leaf == null || leaf === '') {
    return [{ label: sectionLabel }];
  }
  return [
    { label: sectionLabel, href: sectionHref },
    { label: leaf },
  ];
}
