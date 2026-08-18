/**
 * Seed create-form values from URL query params (writable schema fields only).
 */

import { ApiResourceMetadata } from '@/types/api/metadata';
import { isNestedRelationProperty } from '@/utils/nestedRelationProperty';
import { PrimaryKeyService } from '@/utils/primaryKeyService';
import { getUploadConfig } from '@/utils/uploadMetadata';

export type QueryParamValue = string | string[] | undefined;
export type QueryParams = Record<string, QueryParamValue>;

function firstQueryValue(value: QueryParamValue): string | undefined {
  if (value == null) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw == null) return undefined;
  return String(raw);
}

export function isWritableCreateField(
  key: string,
  def: any,
  metadata: ApiResourceMetadata,
  excludeFields: string[] = []
): boolean {
  if (!def || typeof def !== 'object') return false;
  if (excludeFields.includes(key)) return false;
  if (def.readOnly) return false;
  const pk = PrimaryKeyService.detectPrimaryKey(metadata);
  if (pk && key === pk) return false;
  if (getUploadConfig(def)) return false;
  if (isNestedRelationProperty(def)) return false;
  if (def.type === 'array' || def.type === 'object') return false;
  return true;
}

function coerceQueryValue(raw: string, def: any): unknown {
  const nullable = def?.nullable === true;
  if (nullable && (raw === '' || raw === 'null')) {
    return null;
  }

  const type = def?.type;
  const format = def?.format;
  const isInteger =
    type === 'integer' || format === 'int64' || format === 'int32';

  if (isInteger) {
    if (raw.trim() === '') return undefined;
    const n = Number(raw);
    if (!Number.isFinite(n)) return undefined;
    return n;
  }

  if (type === 'boolean') {
    if (raw === 'true' || raw === '1') return true;
    if (raw === 'false' || raw === '0') return false;
    return undefined;
  }

  return raw;
}

/**
 * Build seeded form values from search params.
 * `seedFromQuery: false` / omitted → empty object.
 * `true` → any writable schema field present in the query.
 * `string[]` → those keys only, still intersected with writable fields.
 * Does not overwrite a key that already has a typed value in `currentValues`.
 */
export function seedFormValuesFromQuery(
  searchParams: QueryParams,
  metadata: ApiResourceMetadata | null | undefined,
  options: {
    seedFromQuery?: boolean | string[];
    excludeFields?: string[];
    currentValues?: Record<string, any>;
  } = {}
): Record<string, any> {
  const { seedFromQuery, excludeFields = [], currentValues = {} } = options;
  if (!seedFromQuery || !metadata?.swagger_schema?.properties) {
    return {};
  }

  const properties = metadata.swagger_schema.properties;
  const allowlist = Array.isArray(seedFromQuery) ? new Set(seedFromQuery) : null;
  const seeded: Record<string, any> = {};

  const keys = Object.keys(searchParams);
  for (const key of keys) {
    if (allowlist && !allowlist.has(key)) continue;
    if (!(key in properties)) continue;
    const def = properties[key];
    if (!isWritableCreateField(key, def, metadata, excludeFields)) continue;

    if (
      Object.prototype.hasOwnProperty.call(currentValues, key) &&
      currentValues[key] !== undefined &&
      currentValues[key] !== ''
    ) {
      continue;
    }

    const raw = firstQueryValue(searchParams[key]);
    if (raw === undefined) continue;
    const coerced = coerceQueryValue(raw, def);
    if (coerced === undefined) continue;
    seeded[key] = coerced;
  }

  return seeded;
}
