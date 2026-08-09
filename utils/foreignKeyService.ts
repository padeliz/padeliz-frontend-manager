/**
 * Foreign Key Service
 * Handles foreign key relationships and linked resource data fetching
 */

import { ApiResourceMetadata } from '@/types/api/metadata';
import { LinkedResourceInfo } from '@/types/utils/field-formatter';

export class ForeignKeyService {
  /**
   * Check if a field is a foreign key based on naming convention and type
   */
  static isForeignKeyField(
    fieldKey: string,
    fieldDefinition: any,
    metadata: ApiResourceMetadata
  ): boolean {
    // Add null checks to prevent runtime errors
    if (!fieldKey || !fieldDefinition || !metadata) {
      return false;
    }

    // Check if it's a foreign key based on naming convention and type
    if (
      fieldKey.endsWith('_id') &&
      fieldDefinition.type === 'integer' &&
      fieldDefinition.format === 'int64'
    ) {
      // Look for corresponding linked resource field
      const linkedResourceKey = fieldKey.replace('_id', '');
      const linkedResource = metadata.swagger_schema?.properties?.[linkedResourceKey];

      return linkedResource?.oneOf?.some((ref: any) => ref.$ref) ?? false;
    }

    return false;
  }

  /**
   * Get linked resource information for a foreign key field
   */
  static getLinkedResourceInfo(
    fieldKey: string,
    metadata: ApiResourceMetadata
  ): LinkedResourceInfo | null {
    // Add null checks to prevent runtime errors
    if (!fieldKey || !metadata || !metadata.swagger_schema?.properties) {
      return null;
    }

    const fieldDefinition = metadata.swagger_schema.properties[fieldKey];

    if (!this.isForeignKeyField(fieldKey, fieldDefinition, metadata)) {
      return null;
    }

    const linkedResourceKey = fieldKey.replace('_id', '');
    const linkedResource = metadata.swagger_schema.properties[linkedResourceKey];

    if (!linkedResource) {
      return null;
    }

    // Extract resource name from the $ref
    const ref = linkedResource.oneOf?.find((ref: any) => ref.$ref);
    if (!ref?.$ref) {
      return null;
    }

    // Extract resource name from reference (e.g., "#/components/schemas/Player" -> "Player")
    const resourceName = ref.$ref.split('/').pop()?.toLowerCase() || '';

    // Get display field from metadata or fallback to 'id'
    const displayField = metadata.display_field || 'id';

    return {
      resourceName,
      displayField,
      fetchOptions: () => this.fetchLinkedResourceOptions(resourceName, displayField)
    };
  }

  /**
   * Fetch options for a linked resource
   */
  static async fetchLinkedResourceOptions(
    resourceName: string,
    displayField: string
  ): Promise<Array<{id: number, label: string}>> {
    try {
      // Import API services dynamically to avoid circular dependencies
      const { PlayersApiService } = await import('@/services/api/playersApi');
      const { LocationsApiService } = await import('@/services/api/locationsApi');
      const { EditionsApiService } = await import('@/services/api/editionsApi');
      const { ClubsApiService } = await import('@/services/api/clubsApi');
      const { DivisionsApiService } = await import('@/services/api/divisionsApi');

      let service: any;
      let fetchMethod: string;

      // Map resource names to their corresponding API services
      switch (resourceName) {
        case 'player':
          service = new PlayersApiService();
          fetchMethod = 'getPlayers';
          break;
        case 'location':
          service = new LocationsApiService();
          fetchMethod = 'getLocations';
          break;
        case 'edition':
          service = new EditionsApiService();
          fetchMethod = 'getEditions';
          break;
        case 'club':
          service = new ClubsApiService();
          fetchMethod = 'getClubs';
          break;
        case 'division':
          service = new DivisionsApiService();
          fetchMethod = 'getDivisions';
          break;
        default:
          console.warn(`Unknown resource type: ${resourceName}`);
          throw new Error(`Unknown resource type: ${resourceName}`);
      }

      // Fetch data with reasonable limits for dropdowns
      const response = await service[fetchMethod]({
        page: 1,
        per_page: 100, // Reasonable limit for dropdown options
        sort_by: { [displayField]: 'asc' }
      });

      // Transform data to the expected format
      return response.data.map((item: any) => ({
        id: item.id,
        label: item[displayField] || `Item ${item.id}`
      }));

    } catch (error) {
      console.error(`Error fetching ${resourceName} options:`, error);
      return [];
    }
  }

  /**
   * Get the current display value for a foreign key
   */
  static getForeignKeyDisplayValue(
    fieldKey: string,
    fieldValue: any,
    metadata: ApiResourceMetadata
  ): string {
    if (!fieldValue) return '';

    // Add null checks to prevent runtime errors
    if (!fieldKey || !metadata || !metadata.filterable_fields) {
      console.error(`Invalid parameters for field: ${fieldKey}`);
      throw new Error(`Invalid parameters for field: ${fieldKey}`);
    }

    // Try to get the display value from filterable fields
    const filterField = metadata.filterable_fields[fieldKey];
    if (filterField?.type === 'foreign_key' && filterField.values) {
      const displayValue = (filterField.values as Record<string, string>)[String(fieldValue)];
      if (displayValue) {
        return displayValue;
      }
    }

    console.error(`No display value found for field: ${fieldKey}`);
    throw new Error(`No display value found for field: ${fieldKey}`);
  }
}
