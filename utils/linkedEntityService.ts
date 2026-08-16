/**
 * Linked Entity Service
 * Detects HasMany array $ref links from parent metadata and lists them via resource_path.
 */

import { ApiResourceMetadata } from '@/types/api/metadata';
import { LinkedEntityConfig } from '@/types/ui/pages';
import { LinkedEntityServiceConfig } from '@/types/utils/linked-entities';
import { BaseApiService } from '@/services/api/baseApi';
import { PrimaryKeyService } from './primaryKeyService';

const listApi = new BaseApiService();

export class LinkedEntityService {
  /**
   * Detect linked entities from API schema metadata
   */
  static async detectLinkedEntities(
    config: LinkedEntityServiceConfig,
    getLinkedResourceMetadata: (
      resourceName: string
    ) => Promise<ApiResourceMetadata | null>
  ): Promise<LinkedEntityConfig[]> {
    const { metadata } = config;
    const linkedEntities: LinkedEntityConfig[] = [];

    if (!metadata?.swagger_schema?.properties) {
      return linkedEntities;
    }

    for (const [fieldKey, fieldDefinition] of Object.entries(
      metadata.swagger_schema.properties
    )) {
      if (!this.isLinkedEntityField(fieldKey, fieldDefinition)) {
        continue;
      }

      const linkedResourceName =
        this.extractLinkedResourceName(fieldDefinition);
      if (!linkedResourceName) continue;

      try {
        const linkedResourceMetadata =
          await getLinkedResourceMetadata(linkedResourceName);
        if (!linkedResourceMetadata?.resource_path) {
          continue;
        }

        const foreignKeyField = this.determineForeignKeyFieldFromSchema(
          linkedResourceMetadata,
          metadata.schema_name
        );
        if (!foreignKeyField) {
          continue;
        }

        linkedEntities.push({
          key: fieldKey,
          label: this.formatLabel(fieldKey),
          resourceName: linkedResourceName,
          fetchData: this.buildLinkedEntityFetchFunction(
            linkedResourceMetadata.resource_path,
            foreignKeyField
          ),
          selectedColumns: this.selectLinkedEntityColumns(
            linkedResourceMetadata
          ),
        });
      } catch (error) {
        console.error(
          `Error getting metadata for linked resource ${linkedResourceName}:`,
          error
        );
      }
    }

    return linkedEntities;
  }

  /**
   * fetchData(parentId, params) — matches LinkedEntitySection arity
   */
  static buildLinkedEntityFetchFunction(
    resourcePath: string,
    foreignKeyField: string
  ): (parentId: number, params: any) => Promise<any> {
    const path = resourcePath.replace(/^\//, '');
    return async (parentId: number, params: any = {}) => {
      const query = new URLSearchParams();
      if (params.page != null) query.set('page', String(params.page));
      if (params.per_page != null) query.set('per_page', String(params.per_page));
      if (params.q) query.set('q', String(params.q));
      query.set(`filters[${foreignKeyField}]`, String(parentId));
      if (params.filters && typeof params.filters === 'object') {
        Object.entries(params.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && key !== foreignKeyField) {
            query.set(`filters[${key}]`, String(value));
          }
        });
      }
      if (params.sort_by && typeof params.sort_by === 'object') {
        Object.entries(params.sort_by).forEach(([key, value]) => {
          if (value) query.set(`sort_by[${key}]`, String(value));
        });
      }
      const qs = query.toString();
      return listApi.listResource(`/${path}${qs ? `?${qs}` : ''}`);
    };
  }

  static selectLinkedEntityColumns(metadata: ApiResourceMetadata): string[] {
    const primaryKey = PrimaryKeyService.detectPrimaryKey(metadata);
    if (!primaryKey) {
      return Object.keys(metadata.swagger_schema.properties);
    }

    const columns = [primaryKey];

    if (metadata.display_field && metadata.display_field !== primaryKey) {
      columns.push(metadata.display_field);
    }

    if (metadata.searchable_fields?.length > 0) {
      columns.push(...metadata.searchable_fields);
    }
    if (Object.keys(metadata.filterable_fields || {}).length > 0) {
      columns.push(...Object.keys(metadata.filterable_fields));
    }
    if (metadata.sortable_fields?.length > 0) {
      columns.push(...metadata.sortable_fields);
    }

    return [...new Set(columns)];
  }

  private static isLinkedEntityField(
    fieldKey: string,
    fieldDefinition: any
  ): boolean {
    return (
      fieldDefinition.type === 'array' &&
      !!fieldDefinition.items?.$ref &&
      !fieldKey.endsWith('_id')
    );
  }

  private static extractLinkedResourceName(
    fieldDefinition: any
  ): string | null {
    const ref = fieldDefinition.items?.$ref;
    if (!ref) return null;
    return ref.split('/').pop() || null;
  }

  /**
   * Strict FK: filterable_fields foreign_key whose related_schema_name matches parent.
   */
  private static determineForeignKeyFieldFromSchema(
    linkedResourceMetadata: ApiResourceMetadata,
    parentResourceName: string
  ): string | null {
    const filters = linkedResourceMetadata.filterable_fields || {};
    const parent = parentResourceName.toLowerCase();

    const matches = Object.entries(filters).filter(([_, def]) => {
      if (!def || typeof def !== 'object') return false;
      if ((def as any).type !== 'foreign_key') return false;
      const related = String(
        (def as any).related_schema_name || ''
      ).toLowerCase();
      return related === parent;
    });

    if (matches.length === 1) {
      return matches[0][0];
    }

    if (matches.length > 1) {
      // Prefer exact `{parent}_id` when multiple FKs point at same schema
      const exact = matches.find(
        ([field]) => field === `${parent}_id` || field.endsWith(`_${parent}_id`)
      );
      return (exact || matches[0])[0];
    }

    return null;
  }

  private static formatLabel(fieldKey: string): string {
    return fieldKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}
