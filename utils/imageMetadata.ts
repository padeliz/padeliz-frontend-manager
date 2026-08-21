/**
 * Parse and resolve x-padeliz-image metadata from OpenAPI property definitions.
 */

export type PadelizImageConfig = {
  role: 'list';
};

const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
]);

export function getImageConfig(fieldDefinition: any): PadelizImageConfig | null {
  if (!fieldDefinition) return null;
  const raw =
    fieldDefinition['x-padeliz-image'] ||
    fieldDefinition['x']?.['padeliz-image'];
  if (!raw || typeof raw !== 'object') return null;
  if (raw.role !== 'list') return null;
  return { role: 'list' };
}

/** True when URL path ends with a known image extension (querystring allowed). */
export function isListImageUrl(url: unknown): url is string {
  if (typeof url !== 'string' || url.trim() === '') return false;
  const withoutQuery = url.split('?')[0] ?? '';
  const match = withoutQuery.match(/\.([a-zA-Z0-9]+)$/);
  if (!match) return false;
  return IMAGE_EXTENSIONS.has(match[1].toLowerCase());
}

export function getNestedValue(item: any, path: string): unknown {
  if (!path || item == null) return undefined;
  return path.split('.').reduce((acc: any, key: string) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return acc[key];
  }, item);
}
