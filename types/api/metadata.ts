/**
 * API Metadata Types
 * Resource metadata and configuration from the backend API
 */

export interface ApiResourceMetadata {
  version: string;
  schema_name: string;
  /** Manager API + Expo UI path segment, e.g. "locations", "event-divisions" */
  resource_path: string;
  swagger_schema: {
    required: string[];
    properties: Record<string, any>;
  };
  request_body: Record<string, any>;
  display_field?: string;
  searchable_fields: string[];
  filterable_fields: Record<string, ApiFilterFieldDefinition>;
  sortable_fields: string[];
  /** Preferred list column order after PK (not an allowlist). Empty = legacy heuristic. */
  list_fields?: string[];
}

export interface ApiFilterFieldDefinition {
  type: 'string' | 'integer' | 'float' | 'boolean' | 'foreign_key';
  values?: (string | number | boolean)[] | Record<string, string>;
  related_schema_name?: string;
  related_schema_field?: string;
}
