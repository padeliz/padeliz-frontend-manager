/**
 * URL-driven AppLayout chrome visibility (?fs=1 or ?hide=nav,sidebar,...).
 */

import { withSearchParams } from '@/utils/withSearchParams';

export type LayoutChromeRegion =
  | 'nav'
  | 'sidebar'
  | 'breadcrumbs'
  | 'header'
  | 'tabs'
  | 'subtabs';

export const ALL_CHROME_REGIONS: LayoutChromeRegion[] = [
  'nav',
  'sidebar',
  'breadcrumbs',
  'header',
  'tabs',
  'subtabs',
];

/** true = region is rendered; false = hidden */
export type LayoutChromeVisibility = Record<LayoutChromeRegion, boolean>;

const CHROME_PARAM_KEYS = ['fs', 'hide'] as const;

function normalizeParam(
  value: string | string[] | undefined
): string | undefined {
  if (value == null) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === '' ? undefined : raw;
}

function allVisible(): LayoutChromeVisibility {
  return Object.fromEntries(
    ALL_CHROME_REGIONS.map(region => [region, true])
  ) as LayoutChromeVisibility;
}

function allHidden(): LayoutChromeVisibility {
  return Object.fromEntries(
    ALL_CHROME_REGIONS.map(region => [region, false])
  ) as LayoutChromeVisibility;
}

function isFullscreenValue(fs: string | undefined): boolean {
  return fs === '1' || fs === 'true';
}

export function parseLayoutChromeParams(
  params: Record<string, string | string[] | undefined>
): { visibility: LayoutChromeVisibility; isFullscreen: boolean } {
  const fs = normalizeParam(params.fs);
  const isFullscreen = isFullscreenValue(fs);

  if (isFullscreen) {
    return { visibility: allHidden(), isFullscreen: true };
  }

  const visibility = allVisible();
  const hide = normalizeParam(params.hide);
  if (hide) {
    for (const token of hide.split(',')) {
      const key = token.trim();
      if (ALL_CHROME_REGIONS.includes(key as LayoutChromeRegion)) {
        visibility[key as LayoutChromeRegion] = false;
      }
    }
  }

  return { visibility, isFullscreen: false };
}

export function isRegionVisible(
  visibility: LayoutChromeVisibility,
  region: LayoutChromeRegion
): boolean {
  return visibility[region];
}

export type LayoutChromeQueryOptions = {
  fs?: boolean;
  hide?: LayoutChromeRegion[];
};

export function withLayoutChromeQuery(
  href: string,
  options: LayoutChromeQueryOptions
): string {
  const next: Record<string, string | null> = {};

  if (options.fs === true) {
    next.fs = '1';
    next.hide = null;
    return withSearchParams(href, next);
  }

  if (options.fs === false) {
    next.fs = null;
  }

  if (options.hide != null) {
    if (options.hide.length === 0) {
      next.hide = null;
    } else {
      next.hide = options.hide.join(',');
    }
  }

  return withSearchParams(href, next);
}

export function stripLayoutChromeQuery(
  hrefOrParams: string | Record<string, string | string[] | undefined>
): string | Record<string, string | string[] | undefined> {
  if (typeof hrefOrParams === 'string') {
    const qIndex = hrefOrParams.indexOf('?');
    if (qIndex < 0) return hrefOrParams;
    const path = hrefOrParams.slice(0, qIndex);
    const search = new URLSearchParams(hrefOrParams.slice(qIndex + 1));
    for (const key of CHROME_PARAM_KEYS) {
      search.delete(key);
    }
    const qs = search.toString();
    return qs ? `${path}?${qs}` : path;
  }

  const next = { ...hrefOrParams };
  for (const key of CHROME_PARAM_KEYS) {
    delete next[key];
  }
  return next;
}

export function buildLayoutChromeHref(
  pathname: string,
  searchParams: Record<string, string | string[] | undefined>,
  options: LayoutChromeQueryOptions
): string {
  const merged = stripLayoutChromeQuery({ ...searchParams }) as Record<
    string,
    string | string[] | undefined
  >;

  const flat: Record<string, string | null | undefined> = {};
  for (const [key, value] of Object.entries(merged)) {
    if (value == null) continue;
    flat[key] = normalizeParam(value);
  }

  if (options.fs === true) {
    flat.fs = '1';
    delete flat.hide;
  } else {
    if (options.fs === false) {
      delete flat.fs;
    }
    if (options.hide != null) {
      if (options.hide.length === 0) {
        delete flat.hide;
      } else {
        flat.hide = options.hide.join(',');
      }
    }
  }

  return withSearchParams(pathname, flat);
}
