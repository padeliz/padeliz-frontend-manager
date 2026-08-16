/**
 * Detect OpenAPI nested relation props (typeless $ref / oneOf / allOf).
 * These are response dumps, not editable form fields.
 */

import { getUploadConfig } from './uploadMetadata';

export function isNestedRelationProperty(fieldDefinition: any): boolean {
  if (!fieldDefinition || typeof fieldDefinition !== 'object') {
    return false;
  }

  // Uploads are editable even when schema shape is unusual
  if (getUploadConfig(fieldDefinition)) {
    return false;
  }

  if (typeof fieldDefinition.$ref === 'string') {
    return true;
  }

  if (
    Array.isArray(fieldDefinition.oneOf) &&
    fieldDefinition.oneOf.some(
      (item: any) => item && typeof item.$ref === 'string'
    )
  ) {
    return true;
  }

  if (
    Array.isArray(fieldDefinition.allOf) &&
    fieldDefinition.allOf.some(
      (item: any) =>
        item &&
        (typeof item.$ref === 'string' ||
          (item.oneOf &&
            item.oneOf.some((x: any) => x && typeof x.$ref === 'string')))
    )
  ) {
    return true;
  }

  // Typeless property (no scalar/object/array type) — unsafe for forms
  if (fieldDefinition.type == null || fieldDefinition.type === undefined) {
    return true;
  }

  return false;
}
