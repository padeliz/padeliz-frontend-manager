/**
 * Linked Entity Service
 * Automatically detects and configures linked entities from API schema metadata
 * Uses real schema information and ForeignKeyService logic
 */

import { ApiResourceMetadata } from '@/types/api/metadata';
import { LinkedEntityConfig } from '@/types/ui/pages';
import { LinkedEntityServiceConfig } from '@/types/utils/linked-entities';
import { PrimaryKeyService } from './primaryKeyService';

export class LinkedEntityService {
  /**
   * Detect linked entities from API schema metadata
   * This method requires the linked resource metadata to determine the correct foreign key field
   */
  static async detectLinkedEntities(
    config: LinkedEntityServiceConfig,
    getLinkedResourceMetadata: (
      resourceName: string
    ) => Promise<ApiResourceMetadata | null>
  ): Promise<LinkedEntityConfig[]> {
    const { metadata, parentResourceId } = config;
    const linkedEntities: LinkedEntityConfig[] = [];

    if (!metadata?.swagger_schema?.properties) {
      return linkedEntities;
    }

    // Find array fields with $ref references (linked entities)
    for (const [fieldKey, fieldDefinition] of Object.entries(
      metadata.swagger_schema.properties
    )) {
      if (this.isLinkedEntityField(fieldKey, fieldDefinition)) {
        const linkedResourceName =
          this.extractLinkedResourceName(fieldDefinition);

        if (linkedResourceName) {
          try {
            // Get the actual metadata for the linked resource
            const linkedResourceMetadata =
              await getLinkedResourceMetadata(linkedResourceName);

            if (linkedResourceMetadata) {
              const foreignKeyField = this.determineForeignKeyFieldFromSchema(
                linkedResourceMetadata,
                metadata.schema_name
              );

              const selectedColumns = this.selectLinkedEntityColumns(
                linkedResourceMetadata
              );

              if (foreignKeyField) {
                const linkedEntity = {
                  key: fieldKey,
                  label: this.formatLabel(fieldKey),
                  resourceName: linkedResourceName,
                  fetchData: this.buildLinkedEntityFetchFunction(
                    linkedResourceName,
                    foreignKeyField,
                    parentResourceId
                  ),
                  selectedColumns,
                };
                linkedEntities.push(linkedEntity);
              }
            }
          } catch (error) {
            console.error(
              `Error getting metadata for linked resource ${linkedResourceName}:`,
              error
            );
          }
        }
      }
    }

    return linkedEntities;
  }

  /**
   * Build a fetch function for a linked entity using existing API services
   */
  static buildLinkedEntityFetchFunction(
    linkedResourceName: string,
    foreignKeyField: string,
    parentId: string | number
  ): (params: any) => Promise<any> {
    return async (params: any) => {
      // Get the appropriate API service for the linked resource
      const apiService =
        await this.getApiServiceForResource(linkedResourceName);

      if (!apiService) {
        throw new Error(
          `No API service found for resource: ${linkedResourceName}`
        );
      }

      // Add the foreign key filter to the params
      const enhancedParams = {
        page: params.page,
        per_page: params.per_page,
        filters: {
          [foreignKeyField]: parentId,
        },
      };

      // Use the service's get method (e.g., getPlayers, getClubs, etc.)
      const methodName = this.getMethodNameForResource(linkedResourceName);
      return await apiService[methodName](enhancedParams);
    };
  }

  /**
   * Select columns for linked entity tables based on metadata priority
   */
  static selectLinkedEntityColumns(metadata: ApiResourceMetadata): string[] {
    const primaryKey = PrimaryKeyService.detectPrimaryKey(metadata);
    if (!primaryKey) {
      return Object.keys(metadata.swagger_schema.properties);
    }

    const columns = [primaryKey];

    // Add display field if it exists and is different from primary key
    if (metadata.display_field && metadata.display_field !== primaryKey) {
      columns.push(metadata.display_field);
    }

    // Add other relevant fields regardless of display_field existence
    if (metadata.searchable_fields?.length > 0) {
      columns.push(...metadata.searchable_fields);
    }
    if (Object.keys(metadata.filterable_fields || {}).length > 0) {
      columns.push(...Object.keys(metadata.filterable_fields));
    }
    if (metadata.sortable_fields?.length > 0) {
      columns.push(...metadata.sortable_fields);
    }

    // Remove duplicates and return
    return [...new Set(columns)];
  }

  /**
   * Get the appropriate API service for a resource
   */
  private static async getApiServiceForResource(
    resourceName: string
  ): Promise<any> {
    // Map resource names to their corresponding API services
    switch (resourceName.toLowerCase()) {
      case 'player':
        const { PlayersApiService } = await import('@/services/api/playersApi');
        return new PlayersApiService();
      case 'club':
        const { ClubsApiService } = await import('@/services/api/clubsApi');
        return new ClubsApiService();
      case 'division':
        const { DivisionsApiService } = await import(
          '@/services/api/divisionsApi'
        );
        return new DivisionsApiService();
      case 'location':
        const { LocationsApiService } = await import(
          '@/services/api/locationsApi'
        );
        return new LocationsApiService();
      case 'edition':
        const { EditionsApiService } = await import(
          '@/services/api/editionsApi'
        );
        return new EditionsApiService();
      case 'editionparticipation':
        const { EditionParticipationsApiService } = await import(
          '@/services/api/editionParticipationsApi'
        );
        return new EditionParticipationsApiService();
      case 'editiondivision':
        const { EditionDivisionsApiService } = await import(
          '@/services/api/editionDivisionsApi'
        );
        return new EditionDivisionsApiService();
      case 'editionlottery':
        const { EditionLotteriesApiService } = await import(
          '@/services/api/editionLotteriesApi'
        );
        return new EditionLotteriesApiService();
      case 'editionluckyone':
        const { EditionLuckyOnesApiService } = await import(
          '@/services/api/editionLuckyOnesApi'
        );
        return new EditionLuckyOnesApiService();
      case 'playereligibility':
        const { PlayerEligibilitiesApiService } = await import(
          '@/services/api/playerEligibilitiesApi'
        );
        return new PlayerEligibilitiesApiService();
      case 'prize':
        const { PrizesApiService } = await import('@/services/api/prizesApi');
        return new PrizesApiService();
      default:
        console.warn(`Unknown resource type: ${resourceName}`);
        return null;
    }
  }

  /**
   * Get the method name for a resource's list endpoint
   */
  private static getMethodNameForResource(resourceName: string): string {
    // Map resource names to their corresponding method names
    switch (resourceName.toLowerCase()) {
      case 'player':
        return 'getPlayers';
      case 'club':
        return 'getClubs';
      case 'division':
        return 'getDivisions';
      case 'location':
        return 'getLocations';
      case 'edition':
        return 'getEditions';
      case 'editionparticipation':
        return 'getParticipations';
      case 'editiondivision':
        return 'getDivisions';
      case 'editionlottery':
        return 'getLotteries';
      case 'editionluckyone':
        return 'getLuckyOnes';
      case 'playereligibility':
        return 'getEligibilities';
      case 'prize':
        return 'getPrizes';
      default:
        throw new Error(`Unknown method name for resource: ${resourceName}`);
    }
  }

  /**
   * Check if a field is a linked entity (array with $ref)
   */
  private static isLinkedEntityField(
    fieldKey: string,
    fieldDefinition: any
  ): boolean {
    return (
      fieldDefinition.type === 'array' &&
      fieldDefinition.items?.$ref &&
      !fieldKey.endsWith('_id') // Exclude foreign key fields
    );
  }

  /**
   * Extract linked resource name from $ref
   */
  private static extractLinkedResourceName(
    fieldDefinition: any
  ): string | null {
    const ref = fieldDefinition.items?.$ref;
    if (!ref) return null;

    // Extract resource name from reference (e.g., "#/components/schemas/Player" -> "Player")
    return ref.split('/').pop() || null;
  }

  /**
   * Determine the foreign key field that links back to the parent by analyzing the linked resource's schema
   */
  private static determineForeignKeyFieldFromSchema(
    linkedResourceMetadata: ApiResourceMetadata,
    parentResourceName: string
  ): string | null {
    if (!linkedResourceMetadata?.swagger_schema?.properties) {
      return null;
    }

    const properties = linkedResourceMetadata.swagger_schema.properties;

    // Look for foreign key fields that reference the parent resource
    const possibleForeignKeyFields = Object.keys(properties).filter(
      fieldName => {
        const field = properties[fieldName];

        // Check if it's a foreign key field (integer type, ends with _id)
        if (field.type !== 'integer' || !fieldName.endsWith('_id')) {
          return false;
        }

        // Check if the field name references the parent resource
        return this.fieldReferencesParent(fieldName, parentResourceName);
      }
    );

    // Return the first matching foreign key field
    return possibleForeignKeyFields[0] || null;
  }

  /**
   * Check if a field name references the parent resource
   */
  private static fieldReferencesParent(
    fieldName: string,
    parentResourceName: string
  ): boolean {
    // Convert parent resource name to expected foreign key pattern
    const parentName = parentResourceName.toLowerCase().replace(/^api/, '');

    // Check if the field name contains the parent resource name
    return (
      fieldName.includes(parentName) ||
      fieldName.includes(parentResourceName.toLowerCase()) ||
      // Common patterns
      (parentResourceName.toLowerCase().includes('player') &&
        fieldName.includes('player')) ||
      (parentResourceName.toLowerCase().includes('edition') &&
        fieldName.includes('edition')) ||
      (parentResourceName.toLowerCase().includes('club') &&
        fieldName.includes('club')) ||
      (parentResourceName.toLowerCase().includes('location') &&
        fieldName.includes('location'))
    );
  }

  /**
   * Format field key into a readable label
   */
  private static formatLabel(fieldKey: string): string {
    return fieldKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}
