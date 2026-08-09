/**
 * Resource Field Display Component
 * Displays individual resource fields with proper formatting
 */

import { ApiResourceMetadata } from '@/types/api/metadata';
import { formatField } from '@/utils/fieldFormatter';
import React from 'react';
import { Text, View } from 'react-native';

export interface ResourceFieldDisplayProps {
  fieldKey: string;
  fieldValue: any;
  metadata: ApiResourceMetadata;
  excludeFields?: string[];
}

export default function ResourceFieldDisplay({
  fieldKey,
  fieldValue,
  metadata,
  excludeFields = [],
}: ResourceFieldDisplayProps) {
  // Skip excluded fields
  if (excludeFields.includes(fieldKey)) {
    return null;
  }

  // Get field definition from metadata
  const fieldDefinition = metadata.swagger_schema.properties[fieldKey];
  if (!fieldDefinition) {
    return null;
  }

  // Skip array fields (relationships); they are rendered as linked-entity
  // tables further down the page.
  if (fieldDefinition.type === 'array') {
    return null;
  }

  // Use unified field formatter for consistent display
  const fieldInfo = formatField({
    metadata,
    fieldKey,
    fieldValue,
    mode: 'display',
  });

  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-1">
        {fieldInfo.label}
      </Text>
      <View className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        {typeof fieldInfo.displayValue === 'string' ? (
          <Text className="text-gray-900 text-sm">
            {fieldInfo.displayValue}
          </Text>
        ) : (
          fieldInfo.displayValue
        )}
      </View>
    </View>
  );
}
