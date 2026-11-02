/**
 * Detect OpenAPI string arrays with an items.enum (e.g. purposes: contact|login).
 * Relation / $ref arrays and plain arrays without enum are excluded.
 */

export function isEnumStringArray(fieldDefinition: unknown): boolean {
  if (!fieldDefinition || typeof fieldDefinition !== 'object') {
    return false;
  }

  const def = fieldDefinition as Record<string, any>;
  if (def.type !== 'array') {
    return false;
  }

  const items = def.items;
  if (!items || typeof items !== 'object') {
    return false;
  }

  if (typeof items.$ref === 'string') {
    return false;
  }

  if (
    Array.isArray(items.oneOf) &&
    items.oneOf.some(
      (item: any) => item && typeof item.$ref === 'string'
    )
  ) {
    return false;
  }

  if (items.type != null && items.type !== 'string') {
    return false;
  }

  return Array.isArray(items.enum) && items.enum.length > 0;
}
