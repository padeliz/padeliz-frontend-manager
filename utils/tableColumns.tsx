/**
 * Utility functions for generating common table column configurations
 */

import { ApiResourceMetadata } from '@/types/api/metadata';
import { UiDataTableColumn } from '@/types/ui/tables';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { formatField } from './fieldFormatter';
import { ForeignKeyService } from './foreignKeyService';
import {
  getImageConfig,
  getNestedValue,
  isListImageUrl,
} from './imageMetadata';
import { PrimaryKeyService } from './primaryKeyService';

const LIST_IMAGE_SIZE = 40;

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
    case 'year':
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
    case 'color':
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
      const filterRelated =
        metadata.filterable_fields?.[key]?.related_schema_name || null;
      const linkedResourceField = key.replace(/_id$/, '');
      const linkedResourceDefinition = properties[linkedResourceField];
      const ref: string | undefined = linkedResourceDefinition?.oneOf?.find(
        (entry: any) => entry?.$ref
      )?.$ref;
      const linkedSchemaName =
        filterRelated || (ref ? ref.split('/').pop() || null : null);

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
  // Also include related_schema_name from filterable FK defs without nested props
  Object.entries(metadata.filterable_fields || {}).forEach(([, def]) => {
    if (def?.type === 'foreign_key' && def.related_schema_name) {
      schemas.add(def.related_schema_name);
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
    let linkedId: number | null = null;

    if (linkedResourceMetadata) {
      linkedId = PrimaryKeyService.extractId(
        linkedResource,
        linkedResourceMetadata
      );
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

    const path = linkedResourceMetadata?.resource_path;
    if (path && linkedId != null) {
      const LinkedViewLink = () => {
        const router = useRouter();
        return (
          <Pressable
            onPress={() => router.push(`/${path}/${linkedId}` as any)}
            className="flex-row items-center"
          >
            <Text className="text-blue-600 text-sm underline mr-1">
              {String(displayValue)}
            </Text>
            <Ionicons name="open-outline" size={14} className="text-blue-600" />
          </Pressable>
        );
      };
      return <LinkedViewLink />;
    }

    return (
      <Text className="text-sm text-gray-900">{String(displayValue)}</Text>
    );
  };

  const fieldInfo = formatField({
    metadata,
    fieldKey: foreignKeyField,
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
        } else if (metadata.resource_path) {
          router.push(`/${metadata.resource_path}/${resourceId}` as any);
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
 *
 * When `metadata.list_fields` is non-empty: PK first, then those fields in
 * order, then remaining columns (required then alpha). Otherwise legacy sort.
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
  const properties = swagger_schema?.properties;
  if (!properties) {
    return [];
  }
  const required = swagger_schema.required ?? [];
  const listFields = Array.isArray(metadata.list_fields)
    ? metadata.list_fields
    : [];
  const listFieldSet = new Set(listFields);

  const columns: UiDataTableColumn<any>[] = [];
  const columnByKey = new Map<string, UiDataTableColumn<any>>();

  const primaryKeyField = PrimaryKeyService.detectPrimaryKey(metadata);

  const foreignKeyMappings = identifyForeignKeyMappings(properties, metadata);

  const linkedResourceFieldNames = new Set(
    Array.from(foreignKeyMappings.values()).map(
      mapping => mapping.linkedResourceField
    )
  );

  const pushColumn = (column: UiDataTableColumn<any>) => {
    if (columnByKey.has(column.key)) return;
    columnByKey.set(column.key, column);
    columns.push(column);
  };

  const resolveFieldDefinition = (
    path: string
  ): { def: any; labelKey: string; linkedMeta: ApiResourceMetadata | null } => {
    if (!path.includes('.')) {
      return {
        def: properties[path],
        labelKey: path,
        linkedMeta: null,
      };
    }
    const [relation, ...rest] = path.split('.');
    const leaf = rest.join('.');
    const fkKey = `${relation}_id`;
    const fkMapping = foreignKeyMappings.get(fkKey);
    const linkedMeta =
      fkMapping?.linkedSchemaName != null
        ? linkedResourcesMetadata[fkMapping.linkedSchemaName] ?? null
        : null;
    const def =
      linkedMeta?.swagger_schema?.properties?.[leaf] ??
      properties[path] ??
      null;
    return { def, labelKey: leaf, linkedMeta };
  };

  const createImageColumn = (
    columnKey: string,
    valuePath: string,
    fieldDef: any,
    labelFallback: string
  ): UiDataTableColumn<any> => {
    const title =
      (typeof fieldDef?.title === 'string' && fieldDef.title) ||
      labelFallback;
    return {
      key: columnKey,
      label: title,
      type: 'image',
      sortable: false,
      filterable: false,
      searchable: false,
      width: LIST_IMAGE_SIZE + PADDING,
      render: (item: any) => {
        const url = getNestedValue(item, valuePath);
        if (!isListImageUrl(url)) {
          return <Text className="text-sm text-gray-500">-</Text>;
        }
        return (
          <View className="items-center justify-center">
            <Image
              source={{ uri: url }}
              style={{ width: LIST_IMAGE_SIZE, height: LIST_IMAGE_SIZE }}
              className="rounded-md bg-gray-100"
              accessibilityLabel={title}
            />
          </View>
        );
      },
    };
  };

  Object.entries(properties).forEach(([key, field]: [string, any]) => {
    if (excludeFields.includes(key)) {
      return;
    }

    if (field.type === 'array') {
      return;
    }

    const inListFields = listFieldSet.has(key);
    const isImageField = getImageConfig(field) != null;

    // Keep display_field even when readOnly (e.g. Player computed `name`)
    // so view-link columns still appear. Also keep list_fields / image list fields.
    if (
      field.readOnly &&
      key !== primaryKeyField &&
      metadata.display_field !== key &&
      !inListFields
    ) {
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
    } else if (isImageField && inListFields) {
      column = createImageColumn(key, key, field, key);
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

    if (!isForeignKey && column.type !== 'image') {
      if (metadata.display_field === key) {
        column.render = createViewLinkRenderer(key, metadata, onView);
      } else if (
        !metadata.display_field &&
        onView &&
        key === primaryKeyField
      ) {
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

    pushColumn(column);
  });

  // Dotted list_fields that need linked metadata (retry with linked swagger)
  for (const listKey of listFields) {
    if (excludeFields.includes(listKey)) continue;
    if (!listKey.includes('.')) continue;
    if (columnByKey.has(listKey)) continue;
    const { def, labelKey } = resolveFieldDefinition(listKey);
    if (!getImageConfig(def)) continue;
    pushColumn(createImageColumn(listKey, listKey, def, labelKey));
  }

  const legacySort = (a: UiDataTableColumn<any>, b: UiDataTableColumn<any>) => {
    const aKey = a.key;
    const bKey = b.key;

    if (aKey === primaryKeyField) return -1;
    if (bKey === primaryKeyField) return 1;

    const displayField = metadata.display_field;
    if (displayField) {
      if (aKey === displayField) return -1;
      if (bKey === displayField) return 1;
    }

    const aRequired = required.includes(aKey);
    const bRequired = required.includes(bKey);
    if (aRequired && !bRequired) return -1;
    if (!aRequired && bRequired) return 1;

    return aKey.localeCompare(bKey);
  };

  if (listFields.length === 0) {
    columns.sort(legacySort);
    return columns;
  }

  const ordered: UiDataTableColumn<any>[] = [];
  const used = new Set<string>();

  if (primaryKeyField && columnByKey.has(primaryKeyField)) {
    ordered.push(columnByKey.get(primaryKeyField)!);
    used.add(primaryKeyField);
  }

  for (const listKey of listFields) {
    if (excludeFields.includes(listKey)) continue;
    const fkMapping = foreignKeyMappings.get(listKey);
    const resolvedKey = fkMapping
      ? fkMapping.linkedResourceField
      : listKey;
    if (used.has(resolvedKey)) continue;
    const col = columnByKey.get(resolvedKey);
    if (!col) continue;
    ordered.push(col);
    used.add(resolvedKey);
  }

  const leftovers = columns
    .filter(c => !used.has(c.key))
    .sort(legacySort);
  return [...ordered, ...leftovers];
}
