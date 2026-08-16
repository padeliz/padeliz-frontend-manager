/**
 * Foreign Key Service
 * Detects FKs from metadata.filterable_fields and loads options via resource_path.
 */

import { ApiResourceMetadata } from '@/types/api/metadata';
import { LinkedResourceInfo } from '@/types/utils/field-formatter';
import { ApiResourceMetadataApiService } from '@/services/api/resourceMetadataApi';
import { BaseApiService } from '@/services/api/baseApi';
import { PrimaryKeyService } from './primaryKeyService';

const metadataApi = new ApiResourceMetadataApiService();
const listApi = new BaseApiService();

const relatedMetadataCache: Record<string, ApiResourceMetadata> = {};
const optionsCache: Record<string, Array<{ id: number; label: string }>> = {};

export class ForeignKeyService {
  /** edition_division_id → editionDivision */
  static toCamelLinkedKey(fieldKey: string): string {
    const withoutId = fieldKey.replace(/_id$/, '');
    return withoutId.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  }

  static resolveLinkedProperty(
    fieldKey: string,
    metadata: ApiResourceMetadata
  ): { key: string; definition: any } | null {
    const props = metadata.swagger_schema?.properties;
    if (!props) return null;

    const camel = this.toCamelLinkedKey(fieldKey);
    const snake = fieldKey.replace(/_id$/, '');
    for (const key of [camel, snake]) {
      const def = props[key];
      if (def?.oneOf?.some((ref: any) => ref.$ref) || def?.$ref) {
        return { key, definition: def };
      }
    }
    return null;
  }

  /** FK iff filterable_fields marks foreign_key (no field-name guessing). */
  static isForeignKeyField(
    fieldKey: string,
    _fieldDefinition: any,
    metadata: ApiResourceMetadata
  ): boolean {
    if (!fieldKey || !metadata?.filterable_fields) {
      return false;
    }
    return metadata.filterable_fields[fieldKey]?.type === 'foreign_key';
  }

  static getRelatedSchemaName(
    fieldKey: string,
    metadata: ApiResourceMetadata
  ): string | null {
    const fromFilter =
      metadata.filterable_fields?.[fieldKey]?.related_schema_name;
    if (fromFilter) return fromFilter;

    const linked = this.resolveLinkedProperty(fieldKey, metadata);
    if (linked) {
      const ref =
        linked.definition.oneOf?.find((r: any) => r.$ref)?.$ref ||
        linked.definition.$ref;
      const name = ref?.split('/').pop();
      if (name) return name;
    }
    return null;
  }

  static getLinkedResourceInfo(
    fieldKey: string,
    metadata: ApiResourceMetadata
  ): LinkedResourceInfo | null {
    if (!this.isForeignKeyField(fieldKey, null, metadata)) {
      return null;
    }

    const schemaName = this.getRelatedSchemaName(fieldKey, metadata);
    if (!schemaName) return null;

    const relatedSchemaField =
      metadata.filterable_fields?.[fieldKey]?.related_schema_field;

    return {
      resourceName: schemaName,
      displayField: relatedSchemaField || 'name',
      fetchOptions: () =>
        this.fetchLinkedResourceOptions(schemaName, relatedSchemaField),
    };
  }

  static async getRelatedMetadata(
    schemaName: string
  ): Promise<ApiResourceMetadata | null> {
    if (relatedMetadataCache[schemaName]) {
      return relatedMetadataCache[schemaName];
    }
    try {
      const response = await metadataApi.getApiResourceMetadata(schemaName);
      relatedMetadataCache[schemaName] = response.data;
      return response.data;
    } catch (e) {
      console.warn(`Failed to load metadata for ${schemaName}`, e);
      return null;
    }
  }

  static extractOptionId(
    item: any,
    relatedMetadata: ApiResourceMetadata
  ): number | null {
    return PrimaryKeyService.extractId(item, relatedMetadata);
  }

  static async fetchLinkedResourceOptions(
    schemaName: string,
    displayFieldOverride?: string | null
  ): Promise<Array<{ id: number; label: string }>> {
    try {
      const relatedMeta = await this.getRelatedMetadata(schemaName);
      if (!relatedMeta?.resource_path) {
        console.warn(`No resource_path for schema ${schemaName}`);
        return [];
      }

      const path = relatedMeta.resource_path;
      if (optionsCache[path]) {
        return optionsCache[path];
      }

      const displayField =
        displayFieldOverride ||
        relatedMeta.display_field ||
        PrimaryKeyService.detectPrimaryKey(relatedMeta) ||
        'id';

      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('per_page', '100');
      if (displayField && !displayField.startsWith('id_')) {
        params.set(`sort_by[${displayField}]`, 'asc');
      }

      const response = await listApi.listResource<any>(
        `/${path}?${params.toString()}`
      );
      const rows = Array.isArray(response?.data) ? response.data : [];

      const options = rows
        .map((item: any) => {
          const id = this.extractOptionId(item, relatedMeta);
          if (id == null) return null;
          const label =
            item[displayField] != null && item[displayField] !== ''
              ? String(item[displayField])
              : String(id);
          return { id, label };
        })
        .filter(Boolean) as Array<{ id: number; label: string }>;

      optionsCache[path] = options;
      return options;
    } catch (error) {
      console.error(`Error fetching options for ${schemaName}:`, error);
      return [];
    }
  }

  static getForeignKeyDisplayValue(
    fieldKey: string,
    fieldValue: any,
    metadata: ApiResourceMetadata
  ): string | null {
    const filter = metadata.filterable_fields?.[fieldKey];
    if (filter?.type !== 'foreign_key' || !filter.values) {
      return null;
    }
    const values = filter.values;
    if (Array.isArray(values)) {
      return null;
    }
    const key = String(fieldValue);
    return values[key] ?? values[fieldValue] ?? null;
  }

  /** Test helper — clear in-memory caches */
  static clearCaches(): void {
    Object.keys(relatedMetadataCache).forEach(k => delete relatedMetadataCache[k]);
    Object.keys(optionsCache).forEach(k => delete optionsCache[k]);
  }
}
