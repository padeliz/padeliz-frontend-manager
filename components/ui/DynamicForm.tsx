/**
 * Dynamic Form Component
 * Generates forms dynamically based on API schema
 */

import { UiDynamicFormProps } from '@/types/ui/forms';
import { FormFieldSchema } from '@/types/validation/schemas';
import { validateForm } from '@/utils/validationRules';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import LoadingSpinner from './LoadingSpinner';
import ValidationField from './ValidationField';

export default function DynamicForm({
  schema,
  metadata,
  initialValues = {},
  onSubmit,
  onCancel,
  loading = false,
  submitText = 'Submit',
  cancelText = 'Cancel',
}: UiDynamicFormProps) {
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Initialize form values
  useEffect(() => {
    if (schema && schema.properties) {
      const initialFormValues: Record<string, any> = { ...initialValues };

      // Set default values for required fields
      for (const [fieldName, field] of Object.entries(schema.properties)) {
        const typedField = field as FormFieldSchema;
        if (initialFormValues[fieldName] === undefined) {
          if (typedField.type === 'boolean') {
            initialFormValues[fieldName] = false;
          } else if (typedField.type === 'number') {
            initialFormValues[fieldName] = null;
          } else if (typedField.type === 'array') {
            initialFormValues[fieldName] = [];
          } else {
            initialFormValues[fieldName] = '';
          }
        }
      }
      setValues(initialFormValues);
    }
  }, [schema]); // Remove initialValues from dependencies to prevent infinite re-renders

  // Handle field value change
  const handleFieldChange = useCallback(
    (fieldName: string, value: any) => {
      setValues(prev => ({
        ...prev,
        [fieldName]: value,
      }));

      // Clear error for this field when user starts typing
      if (errors[fieldName]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
      }
    },
    [errors]
  );

  // Handle field blur
  const handleFieldBlur = useCallback((fieldName: string) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: true,
    }));
  }, []);

  // Validate form
  const validateFormFields = useCallback(() => {
    if (!schema) return true;

    const validationResult = validateForm(schema, values);

    if (!validationResult.isValid) {
      const newErrors: Record<string, string> = {};
      validationResult.errors.forEach(error => {
        newErrors[error.field] = error.message;
      });
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  }, [schema, values]);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (!validateFormFields()) {
      return;
    }

    onSubmit(values);
  }, [values, validateFormFields, onSubmit]);

  // Handle form cancellation
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  if (!schema) {
    return (
      <View className="flex-1 justify-center items-center p-6">
        <LoadingSpinner text="Loading form..." />
      </View>
    );
  }

  const fields = Object.entries(schema.properties || {});

  return (
    <View className="flex-1">
      <ScrollView className="flex-1 p-4">
        {schema.title && (
          <View className="mb-6">
            <Text className="text-2xl font-bold text-gray-900">
              {schema.title}
            </Text>
            {schema.description && (
              <Text className="text-gray-600 mt-2">{schema.description}</Text>
            )}
          </View>
        )}

        <View className="space-y-4">
          {fields.map(([fieldName, field]) => {
            return (
              <ValidationField
                key={fieldName}
                field={{ ...field, name: fieldName } as FormFieldSchema}
                metadata={metadata}
                value={values[fieldName]}
                onChange={value => handleFieldChange(fieldName, value)}
                onBlur={() => handleFieldBlur(fieldName)}
                error={touched[fieldName] ? errors[fieldName] : undefined}
              />
            );
          })}
        </View>

        {Object.keys(errors).length > 0 && (
          <View className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <View className="flex-row items-center mb-2">
              <Ionicons
                name="alert-circle"
                size={20}
                className="text-red-500 mr-2"
              />
              <Text className="text-red-800 font-semibold">
                Please fix the following errors:
              </Text>
            </View>
            {Object.entries(errors).map(([field, error]) => (
              <Text key={field} className="text-red-700 text-sm">
                • {error}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>

      <View className="border-t border-gray-200 p-4 bg-white">
        <View className="flex-row space-x-3">
          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            className={`
              flex-1 py-3 px-6 rounded-lg flex-row items-center justify-center
              ${loading ? 'bg-gray-400' : 'bg-blue-500'}
            `}
          >
            {loading ? (
              <LoadingSpinner size="small" color="white" />
            ) : (
              <>
                <Ionicons
                  name="checkmark"
                  size={20}
                  className="text-white mr-2"
                />
                <Text className="text-white font-semibold text-base">
                  {submitText}
                </Text>
              </>
            )}
          </Pressable>

          {onCancel && (
            <Pressable
              onPress={handleCancel}
              disabled={loading}
              className="py-3 px-6 border border-gray-300 rounded-lg"
            >
              <Text className="text-gray-700 font-semibold text-base">
                {cancelText}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
