/**
 * Reusable Resource View Page Component
 * Generic component for displaying individual resource details with linked entities
 */

import AppLayout from '@/components/layout/AppLayout';
import { useResourceMetadata } from '@/hooks/useResourceMetadata';
import { ResourceViewPageProps } from '@/types/ui/pages';
import { formatField } from '@/utils/fieldFormatter';
import { LinkedEntityService } from '@/utils/linkedEntityService';
import { validateFormWithSubmission } from '@/utils/validationRules';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import LoadingSpinner from '../ui/LoadingSpinner';
import EditModeToggle from './EditModeToggle';
import LinkedEntitySection from './LinkedEntitySection';
import ResourceFieldDisplay from './ResourceFieldDisplay';
import ResourceFieldEdit from './ResourceFieldEdit';

export default function ResourceViewPage<
  T extends { [key: string]: any } = any,
>({ config }: ResourceViewPageProps<T>) {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();

  const {
    resourceName,
    resourceDisplayName,
    fetchResource,
    updateResource,
    excludeFields = [],
    title,
    description,
    onBack,
  } = config;

  // State
  const [resource, setResource] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resourceId, setResourceId] = useState<number | null>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Partial<T>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Auto-detected linked entities state
  const [linkedEntities, setLinkedEntities] = useState<any[]>([]);

  // Get resource ID from URL params
  useEffect(() => {
    const id = parseInt(params.id);
    if (id) {
      setResourceId(id);
    }
  }, [params.id]);

  // Fetch metadata
  const { getMetadata, getError, isLoading, fetchMetadata } =
    useResourceMetadata([resourceName]);

  const metadata = getMetadata(resourceName);
  const metadataError = getError(resourceName);
  const metadataLoading = isLoading(resourceName);

  // Fetch resource data
  const loadResource = useCallback(async () => {
    if (!resourceId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetchResource(resourceId);
      setResource(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load resource');
      console.error('Error loading resource:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchResource, resourceId]);

  // Load resource when ID changes
  useEffect(() => {
    if (resourceId) {
      loadResource();
    }
  }, [resourceId, loadResource]);

  // Auto-detect linked entities when metadata loads
  useEffect(() => {
    if (metadata && resourceId) {
      const detectLinkedEntities = async () => {
        try {
          const detectedEntities =
            await LinkedEntityService.detectLinkedEntities(
              {
                parentResourceName: resourceName,
                parentResourceId: resourceId,
                metadata,
              },
              async (linkedResourceName: string) => {
                // Fetch metadata for the linked resource
                await fetchMetadata(linkedResourceName);
                return getMetadata(linkedResourceName);
              }
            );
          setLinkedEntities(detectedEntities);
        } catch (error) {
          console.error('Error detecting linked entities:', error);
          setLinkedEntities([]);
        }
      };

      detectLinkedEntities();
    }
  }, [metadata, resourceId, resourceName, fetchMetadata, getMetadata]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleRefresh = () => {
    loadResource();
  };

  // Edit mode handlers
  const handleEdit = () => {
    if (resource) {
      setEditValues({ ...resource });
      setEditErrors({});
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setEditValues({});
    setEditErrors({});
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!resourceId || !updateResource) {
      setError('Update functionality not available');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setEditErrors({});

      // Format values for submission
      const formattedValues: Record<string, any> = {};
      for (const [fieldKey, value] of Object.entries(editValues)) {
        const fieldInfo = formatField({
          metadata: metadata!,
          fieldKey,
          fieldValue: value,
          mode: 'form',
        });
        formattedValues[fieldKey] = fieldInfo.apiValue;
      }

      // Validate formatted values
      const validationResult = validateFormWithSubmission(
        metadata!.swagger_schema,
        formattedValues,
        metadata!
      );

      if (!validationResult.isValid) {
        const fieldErrors: Record<string, string> = {};
        validationResult.errors.forEach(error => {
          fieldErrors[error.field] = error.message;
        });
        setEditErrors(fieldErrors);
        return;
      }

      // Submit to API
      const response = await updateResource(
        resourceId,
        formattedValues as Partial<T>
      );
      setResource(response.data);
      setIsEditing(false);
      setEditValues({});
    } catch (err: any) {
      if (err.errors && typeof err.errors === 'object') {
        setEditErrors(err.errors);
      } else {
        setError(err.message || 'Failed to update resource');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (fieldKey: string, value: any) => {
    setEditValues(prev => ({
      ...prev,
      [fieldKey]: value,
    }));

    // Clear error for this field when user starts typing
    if (editErrors[fieldKey]) {
      setEditErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
    }
  };

  const handleFieldBlur = (fieldKey: string) => {
    // Field blur logic can be added here if needed
  };

  // Loading state
  if (loading || metadataLoading) {
    return (
      <AppLayout title={title}>
        <View className="flex-1 justify-center items-center p-6">
          <LoadingSpinner text="Loading resource..." />
        </View>
      </AppLayout>
    );
  }

  // Error state
  if (error || metadataError) {
    return (
      <AppLayout title={title}>
        <View className="flex-1 justify-center items-center p-6">
          <View className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-sm">
            <Text className="text-red-800 text-center mb-4">
              {error || metadataError}
            </Text>
            <Pressable
              onPress={handleRefresh}
              className="bg-red-600 rounded-lg px-4 py-2"
            >
              <Text className="text-white font-semibold text-center">
                Retry
              </Text>
            </Pressable>
          </View>
        </View>
      </AppLayout>
    );
  }

  // No resource found
  if (!resource || !metadata) {
    return (
      <AppLayout title={title}>
        <View className="flex-1 justify-center items-center p-6">
          <View className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-sm">
            <Text className="text-gray-800 text-center">
              Resource not found
            </Text>
          </View>
        </View>
      </AppLayout>
    );
  }

  // Get field keys from metadata, excluding excluded fields
  const fieldKeys = Object.keys(metadata.swagger_schema.properties).filter(
    key => !excludeFields.includes(key)
  );

  return (
    <AppLayout title={title}>
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row items-center p-4 border-b border-gray-200">
          <Pressable onPress={handleBack} className="mr-3 p-2">
            <Ionicons name="arrow-back" size={24} className="text-gray-600" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900">{title}</Text>
            {description && (
              <Text className="text-sm text-gray-600">{description}</Text>
            )}
          </View>
          <View className="flex-row items-center space-x-2">
            {!isEditing && (
              <Pressable
                onPress={handleRefresh}
                className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 flex-row items-center"
              >
                <Ionicons
                  name="refresh"
                  size={16}
                  className="text-gray-600 mr-1"
                />
                <Text className="text-gray-700 text-sm">Refresh</Text>
              </Pressable>
            )}
            <EditModeToggle
              isEditing={isEditing}
              onEdit={handleEdit}
              onSave={handleSave}
              onCancel={handleCancel}
              loading={saving}
              disabled={!updateResource}
            />
          </View>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Main Resource Information */}
          <View className="mb-8">
            <Text className="text-xl font-semibold text-gray-900 mb-4">
              {resourceDisplayName} Information
            </Text>

            <View className="bg-white border rounded-lg p-4">
              {fieldKeys.map(fieldKey => {
                if (isEditing) {
                  return (
                    <ResourceFieldEdit
                      key={fieldKey}
                      fieldKey={fieldKey}
                      fieldValue={editValues[fieldKey] ?? resource[fieldKey]}
                      metadata={metadata}
                      onChange={handleFieldChange}
                      onBlur={handleFieldBlur}
                      error={editErrors[fieldKey]}
                      excludeFields={excludeFields}
                      disabled={saving}
                    />
                  );
                } else {
                  return (
                    <ResourceFieldDisplay
                      key={fieldKey}
                      fieldKey={fieldKey}
                      fieldValue={resource[fieldKey]}
                      metadata={metadata}
                      excludeFields={excludeFields}
                    />
                  );
                }
              })}
            </View>
          </View>

          {/* Auto-detected Linked Entities */}
          {linkedEntities.map(linkedEntity => (
            <LinkedEntitySection
              key={linkedEntity.key}
              config={linkedEntity}
              parentId={resourceId!}
            />
          ))}
        </ScrollView>
      </View>
    </AppLayout>
  );
}
