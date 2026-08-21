/**
 * Open an app route in a separate window/tab on web. Native has no windows, so
 * the caller supplies an in-app navigation fallback.
 */

export function openInNewWindow(href: string, fallback?: () => void): void {
  if (
    typeof window !== 'undefined' &&
    typeof window.open === 'function'
  ) {
    window.open(href, '_blank', 'noopener,noreferrer');
    return;
  }
  fallback?.();
}
