/**
 * Resource Field Edit Component
 * Displays individual resource fields as editable form fields
 */

import { ApiResourceMetadata } from '@/types/api/metadata';
import { formatField } from '@/utils/fieldFormatter';
import React from 'react';
import { Text, View } from 'react-native';
import FormFieldSelector from '../ui/FormFieldSelector';
import ValidationField from '../ui/ValidationField';
import ResourceFieldDisplay from './ResourceFieldDisplay';

export interface ResourceFieldEditProps {
  fieldKey: string;
  fieldValue: any;
  metadata: ApiResourceMetadata;
  onChange: (fieldKey: string, value: any) => void;
  onBlur: (fieldKey: string) => void;
  error?: string;
  excludeFields?: string[];
  disabled?: boolean;
}

export default function ResourceFieldEdit({
  fieldKey,
  fieldValue,
  metadata,
  onChange,
  onBlur,
  error,
  excludeFields = [],
  disabled = false,
}: ResourceFieldEditProps) {
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

  // Use unified formatter to determine field configuration
  const fieldInfo = formatField({
    metadata,
    fieldKey,
    fieldValue,
    mode: 'form',
  });

  // Read-only fields stay visible while editing, rendered with the same
  // gray-pill display the view mode uses so toggling Edit doesn't change
  // the visible field set.
  if (!fieldInfo.isEditable) {
    return (
      <ResourceFieldDisplay
        fieldKey={fieldKey}
        fieldValue={fieldValue}
        metadata={metadata}
        excludeFields={excludeFields}
      />
    );
  }

  // Handle field value change
  const handleChange = (value: any) => {
    onChange(fieldKey, value);
  };

  // Handle field blur
  const handleBlur = () => {
    onBlur(fieldKey);
  };

  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-1">
        {fieldInfo.label}
        {fieldDefinition.required && (
          <Text className="text-red-500 ml-1">*</Text>
        )}
      </Text>

      <View>
        {fieldInfo.inputType === 'foreign_key_selector' ? (
          <>
            <FormFieldSelector
              fieldKey={fieldKey}
              fieldValue={fieldValue}
              metadata={metadata}
              onChange={handleChange}
              onBlur={handleBlur}
              error={error}
              disabled={disabled}
              placeholder={fieldInfo.placeholder}
            />
          </>
        ) : (
          <>
            <ValidationField
              field={{ ...fieldDefinition, name: fieldKey }}
              metadata={metadata}
              value={fieldInfo.inputValue}
              onChange={handleChange}
              onBlur={handleBlur}
              error={error}
              disabled={disabled}
              placeholder={fieldInfo.placeholder}
            />
          </>
        )}
      </View>
    </View>
  );
}
