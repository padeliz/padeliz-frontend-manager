/**
 * Resolve a human-readable label for a resource record.
 * Prefer metadata.display_field; fall back to primary key id.
 */

import { ApiResourceMetadata } from '@/types/api/metadata';
import { PrimaryKeyService } from '@/utils/primaryKeyService';

function formatIdFallback(
  metadata: ApiResourceMetadata | null | undefined,
  record: Record<string, any> | null | undefined,
  explicitId?: string | number | null
): string {
  if (explicitId != null && explicitId !== '') {
    return String(explicitId);
  }
  if (metadata && record) {
    const id = PrimaryKeyService.extractId(record, metadata);
    if (id != null) return String(id);
  }
  if (record) {
    for (const key of Object.keys(record)) {
      if (key === 'id' || key.startsWith('id_')) {
        const v = record[key];
        if (v != null && v !== '') return String(v);
      }
    }
  }
  return '';
}

/**
 * @param metadata - Resource metadata (may be missing while loading)
 * @param record - Loaded resource row (may be missing while loading)
 * @param explicitId - Optional route/param id used before record loads
 */
export function getResourceDisplayLabel(
  metadata: ApiResourceMetadata | null | undefined,
  record?: Record<string, any> | null,
  explicitId?: string | number | null
): string {
  if (metadata?.display_field && record) {
    const raw = record[metadata.display_field];
    if (raw != null) {
      const text = String(raw).trim();
      if (text !== '') return text;
    }
  }

  return formatIdFallback(metadata, record, explicitId);
}

/**
 * Page Header title: "Resource: Label" (breadcrumb leaves stay raw).
 */
export function formatResourceHeaderTitle(
  resourceDisplayName: string,
  displayLabel: string
): string {
  const label = displayLabel.trim();
  if (!label) return resourceDisplayName;
  return `${resourceDisplayName}: ${label}`;
}
