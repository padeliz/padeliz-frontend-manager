/**
 * Utility functions for generating common table column configurations
 */

import { ApiResourceMetadata } from '@/types/api/metadata';
import { UiDataTableColumn } from '@/types/ui/tables';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text } from 'react-native';
import { formatField } from './fieldFormatter';
import { ForeignKeyService } from './foreignKeyService';
import { PrimaryKeyService } from './primaryKeyService';

// Constants for better maintainability
const CHAR_WIDTH = 8; // Approximate pixels per character
const PADDING = 32; // Additional padding for column headers

/**
 * Column width configuration based on field types
 */
const COLUMN_WIDTH_CONFIG = {
  // ID columns
  id: 60,

  // Text columns
  text: {
    short: 120, // maxLength <= 50
    medium: 180, // maxLength <= 100
    long: 250, // maxLength > 100
    default: 150, // no maxLength specified
  },

  // Numeric columns
  number: {
    integer: 80,
    decimal: 100,
    currency: 120,
    default: 90,
  },

  // Date/time columns
  date: {
    date: 120,
    datetime: 170,
    time: 100,
    timestamp: 170,
    default: 130,
  },

  // Boolean columns
  boolean: 80,

  // Foreign key columns
  foreignKey: {
    default: 150,
    short: 120,
    long: 200,
  },

  // Minimum and maximum constraints
  min: 60,
  max: 300,
} as const;

/**
 * Calculate optimal column width based on field type, format, and label length
 */
function calculateColumnWidth(
  fieldDefinition: any,
  label: string,
  options: {
    linkedResourceMetadata?: ApiResourceMetadata | null;
  } = {}
): number {
  const labelWidth = Math.max(
    label.length * CHAR_WIDTH + PADDING,
    COLUMN_WIDTH_CONFIG.min
  );

  const schemaBasedWidth =
    options.linkedResourceMetadata !== undefined
      ? calculateForeignKeyWidth(options.linkedResourceMetadata)
      : calculateSchemaBasedWidth(fieldDefinition);

  return Math.min(
    Math.max(labelWidth, schemaBasedWidth),
    COLUMN_WIDTH_CONFIG.max
  );
}

/**
 * Calculate width for foreign key columns based on the linked resource's metadata
 */
function calculateForeignKeyWidth(
  linkedResourceMetadata: ApiResourceMetadata | null
): number {
  const displayField = linkedResourceMetadata?.display_field;

  if (displayField) {
    const displayFieldLength = displayField.length;
    if (displayFieldLength <= 10) {
      return COLUMN_WIDTH_CONFIG.foreignKey.short;
    } else if (displayFieldLength <= 20) {
      return COLUMN_WIDTH_CONFIG.foreignKey.default;
    } else {
      return COLUMN_WIDTH_CONFIG.foreignKey.long;
    }
  }

  return COLUMN_WIDTH_CONFIG.foreignKey.default;
}

/**
 * Calculate width based on field type and format
 */
function calculateSchemaBasedWidth(fieldDefinition: any): number {
  const { type, format, maxLength } = fieldDefinition;

  switch (format) {
    case 'date':
      return COLUMN_WIDTH_CONFIG.date.date;
    case 'datetime':
    case 'date-time':
      return COLUMN_WIDTH_CONFIG.date.datetime;
    case 'time':
      return COLUMN_WIDTH_CONFIG.date.time;
    case 'timestamp':
      return COLUMN_WIDTH_CONFIG.date.timestamp;
  }

  switch (type) {
    case 'boolean':
      return COLUMN_WIDTH_CONFIG.boolean;

    case 'integer':
    case 'number':
      if (format === 'currency') {
        return COLUMN_WIDTH_CONFIG.number.currency;
      } else if (format === 'decimal' || format === 'float') {
        return COLUMN_WIDTH_CONFIG.number.decimal;
      } else {
        return COLUMN_WIDTH_CONFIG.number.integer;
      }

    case 'string':
      // Text field - consider maxLength
      if (maxLength) {
        if (maxLength <= 50) {
          return COLUMN_WIDTH_CONFIG.text.short;
        } else if (maxLength <= 100) {
          return COLUMN_WIDTH_CONFIG.text.medium;
        } else {
          return COLUMN_WIDTH_CONFIG.text.long;
        }
      }
      return COLUMN_WIDTH_CONFIG.text.default;

    default:
      return COLUMN_WIDTH_CONFIG.text.default;
  }
}

/**
 * Map fieldFormatter inputType to table column type
 * Uses fieldFormatter as the single source of truth for field type determination
 */
function mapInputTypeToColumnType(
  inputType: string
): 'text' | 'number' | 'date' | 'boolean' | 'custom' {
  switch (inputType) {
    case 'checkbox':
      return 'boolean';

    case 'number':
      return 'number';

    case 'date':
    case 'datetime':
    case 'time':
      return 'date';

    case 'text':
    case 'email':
    case 'url':
    case 'textarea':
    case 'select':
    case 'foreign_key_selector':
    case 'readonly':
    default:
      return 'text';
  }
}

interface ForeignKeyMapping {
  /** Sibling object field carrying the linked resource (e.g. `player`) */
  linkedResourceField: string;
  /** Original-case linked schema name extracted from $ref (e.g. `Player`) */
  linkedSchemaName: string | null;
}

/**
 * Identify foreign key mappings in the schema using ForeignKeyService.
 * Returns a Map keyed by the foreign key field name (`<x>_id`) whose value
 * contains the sibling object field and the original-case linked schema name
 * derived from the OpenAPI `$ref`.
 */
function identifyForeignKeyMappings(
  properties: any,
  metadata: ApiResourceMetadata
): Map<string, ForeignKeyMapping> {
  const mappings = new Map<string, ForeignKeyMapping>();

  Object.entries(properties).forEach(([key, field]: [string, any]) => {
    if (ForeignKeyService.isForeignKeyField(key, field, metadata)) {
      const linkedResourceField = key.replace(/_id$/, '');
      const linkedResourceDefinition = properties[linkedResourceField];
      const ref: string | undefined = linkedResourceDefinition?.oneOf?.find(
        (entry: any) => entry?.$ref
      )?.$ref;
      const linkedSchemaName = ref ? ref.split('/').pop() || null : null;

      mappings.set(key, {
        linkedResourceField,
        linkedSchemaName,
      });
    }
  });

  return mappings;
}

/**
 * Extract unique linked-resource schema names (original casing) referenced by
 * foreign-key columns in the given metadata. Useful for pre-fetching the
 * linked resources' metadata so that FK columns can render display values.
 */
export function extractLinkedResourceSchemaNames(
  metadata: ApiResourceMetadata
): string[] {
  const properties = metadata?.swagger_schema?.properties;
  if (!properties) {
    return [];
  }
  const mappings = identifyForeignKeyMappings(properties, metadata);
  const schemas = new Set<string>();
  mappings.forEach(({ linkedSchemaName }) => {
    if (linkedSchemaName) {
      schemas.add(linkedSchemaName);
    }
  });
  return Array.from(schemas);
}

/**
 * Create a column for a linked resource instead of the foreign key.
 * The renderer reads the display value from the linked resource's own
 * metadata (`display_field` + primary key), not the parent table's.
 */
function createLinkedResourceColumn(
  foreignKeyField: string,
  linkedResourceField: string,
  metadata: ApiResourceMetadata,
  linkedResourceMetadata: ApiResourceMetadata | null
): UiDataTableColumn<any> {
  const renderLinkedResource = (item: any) => {
    const linkedResource = item[linkedResourceField];

    if (!linkedResource) {
      return <Text className="text-sm text-gray-500">-</Text>;
    }

    let displayValue: any;

    if (linkedResourceMetadata) {
      const displayField = linkedResourceMetadata.display_field;
      if (displayField && linkedResource[displayField] !== undefined && linkedResource[displayField] !== null) {
        displayValue = linkedResource[displayField];
      } else {
        const linkedPrimaryKey =
          PrimaryKeyService.detectPrimaryKey(linkedResourceMetadata);
        if (linkedPrimaryKey && linkedResource[linkedPrimaryKey] !== undefined) {
          displayValue = linkedResource[linkedPrimaryKey];
        }
      }
    }

    if (displayValue === undefined || displayValue === null) {
      return <Text className="text-sm text-gray-500">-</Text>;
    }

    return (
      <Text className="text-sm text-gray-900">{String(displayValue)}</Text>
    );
  };

  const fieldInfo = formatField({
    metadata,
    fieldKey: linkedResourceField,
    fieldValue: null,
    mode: 'display',
  });

  const column: UiDataTableColumn<any> = {
    key: linkedResourceField,
    label: fieldInfo.label,
    type: 'text',
    sortable: metadata.sortable_fields.includes(foreignKeyField),
    filterable: true,
    searchable: metadata.searchable_fields.includes(foreignKeyField),
    width: calculateColumnWidth(
      metadata.swagger_schema.properties[foreignKeyField],
      fieldInfo.label,
      { linkedResourceMetadata }
    ),
    render: renderLinkedResource,
  };
  return column;
}

/**
 * Create a view link renderer for display field columns
 */
function createViewLinkRenderer(
  fieldKey: string,
  metadata: ApiResourceMetadata,
  onView?: (id: number) => void
) {
  return (item: any) => {
    const resourceId = PrimaryKeyService.extractId(item, metadata);
    if (!resourceId) {
      // Fallback to regular formatting if no ID found
      const fieldInfo = formatField({
        metadata,
        fieldKey,
        fieldValue: item[fieldKey],
        mode: 'display',
      });
      return fieldInfo.displayValue;
    }

    // Create a link component
    const ViewLink = () => {
      const router = useRouter();

      const handlePress = () => {
        if (onView) {
          // Use custom view handler if provided
          onView(resourceId);
        } else {
          // Fallback to default navigation
          const resourceName = metadata.schema_name.toLowerCase();
          router.push(`/${resourceName}/${resourceId}` as any);
        }
      };

      // Get the display value
      const fieldInfo = formatField({
        metadata,
        fieldKey,
        fieldValue: item[fieldKey],
        mode: 'display',
      });

      return (
        <Pressable onPress={handlePress} className="flex-row items-center">
          <Text className="text-blue-600 text-sm underline mr-1">
            {fieldInfo.formattedText}
          </Text>
          <Ionicons name="open-outline" size={14} className="text-blue-600" />
        </Pressable>
      );
    };

    return <ViewLink />;
  };
}

/**
 * Generate table columns dynamically from resource metadata.
 *
 * `linkedResourcesMetadata` lets foreign-key columns resolve their display
 * value from the linked resource's own metadata (display_field / primary key)
 * instead of the parent table's. Keys must be the original-case schema names
 * (e.g. `Player`, `Division`, `Edition`) matching the `$ref` of each FK.
 */
export function generateColumnsFromMetadata(
  metadata: ApiResourceMetadata,
  options: {
    excludeFields?: string[];
    onView?: (id: number) => void;
    linkedResourcesMetadata?: Record<string, ApiResourceMetadata>;
  } = {}
): UiDataTableColumn<any>[] {
  const { excludeFields = [], onView, linkedResourcesMetadata = {} } = options;
  const { swagger_schema, searchable_fields, sortable_fields } = metadata;
  const { properties, required = [] } = swagger_schema;

  const columns: UiDataTableColumn<any>[] = [];

  const primaryKeyField = PrimaryKeyService.detectPrimaryKey(metadata);

  const foreignKeyMappings = identifyForeignKeyMappings(properties, metadata);

  const linkedResourceFieldNames = new Set(
    Array.from(foreignKeyMappings.values()).map(
      mapping => mapping.linkedResourceField
    )
  );

  Object.entries(properties).forEach(([key, field]: [string, any]) => {
    if (excludeFields.includes(key)) {
      return;
    }

    if (field.type === 'array') {
      return;
    }

    if (field.readOnly && key !== primaryKeyField) {
      return;
    }

    if (linkedResourceFieldNames.has(key)) {
      return;
    }

    const fkMapping = foreignKeyMappings.get(key);
    const isForeignKey = fkMapping !== undefined;

    let column: UiDataTableColumn<any>;

    if (isForeignKey && fkMapping) {
      const linkedMeta = fkMapping.linkedSchemaName
        ? linkedResourcesMetadata[fkMapping.linkedSchemaName] ?? null
        : null;

      column = createLinkedResourceColumn(
        key,
        fkMapping.linkedResourceField,
        metadata,
        linkedMeta
      );
    } else {
      const fieldInfo = formatField({
        metadata,
        fieldKey: key,
        fieldValue: null,
        mode: 'display',
      });
      column = {
        key,
        label: fieldInfo.label,
        type: mapInputTypeToColumnType(fieldInfo.inputType),
        sortable: sortable_fields.includes(key),
        filterable: true,
        searchable: searchable_fields.includes(key),
        width: calculateColumnWidth(field, fieldInfo.label),
      };
    }

    if (!isForeignKey) {
      if (metadata.display_field === key) {
        column.render = createViewLinkRenderer(key, metadata, onView);
      } else {
        column.render = (item: any) => {
          const fieldInfo = formatField({
            metadata,
            fieldKey: key,
            fieldValue: item[key],
            mode: 'display',
          });
          return fieldInfo.displayValue;
        };
      }
    }

    columns.push(column);
  });

  // Sort columns: primary key first, then required fields, then others
  columns.sort((a, b) => {
    const aKey = a.key;
    const bKey = b.key;

    // Primary key first
    if (aKey === primaryKeyField) return -1;
    if (bKey === primaryKeyField) return 1;

    // Required fields next
    const aRequired = required.includes(aKey);
    const bRequired = required.includes(bKey);
    if (aRequired && !bRequired) return -1;
    if (!aRequired && bRequired) return 1;

    // Then by name
    return aKey.localeCompare(bKey);
  });

  return columns;
}
