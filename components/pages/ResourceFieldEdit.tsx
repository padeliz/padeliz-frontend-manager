/**
 * Resource Field Edit Component
 * Displays individual resource fields as editable form fields
 */

import ManagerFileUpload from '@/components/ui/ManagerFileUpload';
import { ApiResourceMetadata } from '@/types/api/metadata';
import { formatField } from '@/utils/fieldFormatter';
import { isNestedRelationProperty } from '@/utils/nestedRelationProperty';
import { getUploadConfig } from '@/utils/uploadMetadata';
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
  parentId?: number | null;
  onUploadChanged?: () => void;
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
  parentId = null,
  onUploadChanged,
}: ResourceFieldEditProps) {
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
        disabled={disabled}
        onChanged={onUploadChanged}
        error={error}
      />
    );
  }

  if (fieldDefinition.type === 'array') {
    return null;
  }

  if (isNestedRelationProperty(fieldDefinition)) {
    return null;
  }

  const fieldInfo = formatField({
    metadata,
    fieldKey,
    fieldValue,
    mode: 'form',
  });

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

  const handleChange = (value: any) => {
    onChange(fieldKey, value);
  };

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
        ) : (
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
        )}
      </View>
    </View>
  );
}
