/**
 * Resource Field Display Component
 * Displays individual resource fields with proper formatting
 */

import ManagerFileUpload from '@/components/ui/ManagerFileUpload';
import { ApiResourceMetadata } from '@/types/api/metadata';
import { formatField } from '@/utils/fieldFormatter';
import { getUploadConfig } from '@/utils/uploadMetadata';
import React from 'react';
import { Text, View } from 'react-native';

export interface ResourceFieldDisplayProps {
  fieldKey: string;
  fieldValue: any;
  metadata: ApiResourceMetadata;
  excludeFields?: string[];
  parentId?: number | null;
  onUploadChanged?: () => void;
  uploadDisabled?: boolean;
  /** Full resource record for nested FK labels */
  record?: Record<string, any> | null;
}

export default function ResourceFieldDisplay({
  fieldKey,
  fieldValue,
  metadata,
  excludeFields = [],
  parentId = null,
  onUploadChanged,
  uploadDisabled = false,
  record = null,
}: ResourceFieldDisplayProps) {
  if (excludeFields.includes(fieldKey)) {
    return null;
  }

  const fieldDefinition = metadata.swagger_schema.properties[fieldKey];
  if (!fieldDefinition) {
    return null;
  }

  const uploadCfg = getUploadConfig(fieldDefinition);
  if (uploadCfg) {
    return (
      <ManagerFileUpload
        label={fieldDefinition.title || fieldKey}
        config={uploadCfg}
        parentId={parentId}
        value={fieldValue}
        disabled={uploadDisabled}
        onChanged={onUploadChanged}
      />
    );
  }

  if (fieldDefinition.type === 'array') {
    return null;
  }

  const fieldInfo = formatField({
    metadata,
    fieldKey,
    fieldValue,
    mode: 'display',
    record,
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
