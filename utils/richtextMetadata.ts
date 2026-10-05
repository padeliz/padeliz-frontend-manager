/**
 * Parse x-padeliz-richtext from OpenAPI property definitions.
 */

export function isRichTextField(fieldDefinition: any): boolean {
  if (!fieldDefinition || typeof fieldDefinition !== 'object') return false;
  const raw =
    fieldDefinition['x-padeliz-richtext'] ??
    fieldDefinition['x']?.['padeliz-richtext'];
  return raw === true || raw === 1 || raw === 'true';
}
