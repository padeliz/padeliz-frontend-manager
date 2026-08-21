/**
 * Reusable Resource View Page Component
 * Generic component for displaying individual resource details with linked entities
 */

import AppLayout from '@/components/layout/AppLayout';
import ManagerFileUpload from '@/components/ui/ManagerFileUpload';
import { useResourceMetadata } from '@/hooks/useResourceMetadata';
import { ResourceViewPageProps } from '@/types/ui/pages';
import { formatField } from '@/utils/fieldFormatter';
import { LinkedEntityService } from '@/utils/linkedEntityService';
import { isNestedRelationProperty } from '@/utils/nestedRelationProperty';
import { getUploadConfig } from '@/utils/uploadMetadata';
import { validateFormWithSubmission } from '@/utils/validationRules';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
    embedded = false,
    resourceIdOverride = null,
    showLinkedEntities: showLinkedEntitiesProp,
    excludeLinkedEntities = [],
    externalChrome = false,
    showSave = true,
    onChromeStateChange,
  } = config;

  const showLinkedEntities =
    showLinkedEntitiesProp !== undefined
      ? showLinkedEntitiesProp
      : !embedded;

  const [resource, setResource] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resourceId, setResourceId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Partial<T>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [linkedEntities, setLinkedEntities] = useState<any[]>([]);
  const excludedLinkedKeys = useMemo(
    () => new Set(excludeLinkedEntities),
    [excludeLinkedEntities]
  );

  useEffect(() => {
    if (resourceIdOverride != null && Number.isFinite(resourceIdOverride)) {
      setResourceId(resourceIdOverride);
      return;
    }
    const id = parseInt(params.id, 10);
    if (id) setResourceId(id);
  }, [params.id, resourceIdOverride]);

  const { getMetadata, getError, isLoading, fetchMetadata } =
    useResourceMetadata([resourceName]);

  const metadata = getMetadata(resourceName);
  const metadataError = getError(resourceName);
  const metadataLoading = isLoading(resourceName);

  const loadResource = useCallback(async () => {
    if (!resourceId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetchResource(resourceId);
      setResource(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load resource');
    } finally {
      setLoading(false);
    }
  }, [fetchResource, resourceId]);

  useEffect(() => {
    if (resourceId) loadResource();
  }, [resourceId, loadResource]);

  useEffect(() => {
    if (metadata && resourceId && showLinkedEntities) {
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
                await fetchMetadata(linkedResourceName);
                return getMetadata(linkedResourceName);
              }
            );
          setLinkedEntities(
            detectedEntities.filter(e => !excludedLinkedKeys.has(e.key))
          );
        } catch {
          setLinkedEntities([]);
        }
      };
      detectLinkedEntities();
    } else if (!showLinkedEntities) {
      setLinkedEntities(prev => (prev.length === 0 ? prev : []));
    }
  }, [
    metadata,
    resourceId,
    resourceName,
    fetchMetadata,
    getMetadata,
    showLinkedEntities,
    excludedLinkedKeys,
  ]);

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  const handleRefresh = () => loadResource();

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
      const formattedValues: Record<string, any> = {};
      for (const [fieldKey, value] of Object.entries(editValues)) {
        const def = metadata!.swagger_schema.properties[fieldKey];
        if (getUploadConfig(def)) continue;
        const fieldInfo = formatField({
          metadata: metadata!,
          fieldKey,
          fieldValue: value,
          mode: 'form',
        });
        formattedValues[fieldKey] = fieldInfo.apiValue;
      }
      const validationResult = validateFormWithSubmission(
        metadata!.swagger_schema,
        formattedValues,
        metadata!
      );
      if (!validationResult.isValid) {
        const fieldErrors: Record<string, string> = {};
        validationResult.errors.forEach(err => {
          fieldErrors[err.field] = err.message;
        });
        setEditErrors(fieldErrors);
        return;
      }
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
    setEditValues(prev => ({ ...prev, [fieldKey]: value }));
    if (editErrors[fieldKey]) {
      setEditErrors(prev => {
        const next = { ...prev };
        delete next[fieldKey];
        return next;
      });
    }
  };

  useEffect(() => {
    if (!onChromeStateChange) return;
    const dirty =
      isEditing &&
      JSON.stringify(editValues) !== JSON.stringify(resource ?? {});
    onChromeStateChange({
      save: handleSave,
      refresh: handleRefresh,
      ...(updateResource
        ? { edit: handleEdit, cancel: handleCancel }
        : {}),
      isEditing: !!updateResource && isEditing,
      isSaving: saving,
      canSave: !!updateResource && isEditing,
      isDirty: dirty,
    });
  }, [
    onChromeStateChange,
    isEditing,
    saving,
    updateResource,
    editValues,
    resource,
  ]);

  const wrap = (children: React.ReactNode) =>
    embedded ? (
      <View className="flex-1">{children}</View>
    ) : (
      <AppLayout title={title}>{children}</AppLayout>
    );

  if (loading || metadataLoading) {
    return wrap(
      <View className="flex-1 justify-center items-center p-6">
        <LoadingSpinner text="Loading resource..." />
      </View>
    );
  }

  if (error || metadataError) {
    return wrap(
      <View className="flex-1 justify-center items-center p-6">
        <View className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-sm">
          <Text className="text-red-800 text-center mb-4">
            {error || metadataError}
          </Text>
          <Pressable
            onPress={handleRefresh}
            className="bg-red-600 rounded-lg px-4 py-2"
          >
            <Text className="text-white font-semibold text-center">Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!resource || !metadata) {
    return wrap(
      <View className="flex-1 justify-center items-center p-6">
        <Text className="text-gray-800 text-center">Resource not found</Text>
      </View>
    );
  }

  if (!metadata.swagger_schema?.properties) {
    return wrap(
      <View className="flex-1 justify-center items-center p-6">
        <Text
          testID="resource-view-schema-error"
          className="text-red-800 text-center"
        >
          Resource metadata is unavailable. Try refreshing the page.
        </Text>
      </View>
    );
  }

  const fieldKeys = Object.keys(metadata.swagger_schema.properties).filter(
    key => {
      if (excludeFields.includes(key)) return false;
      const def = metadata.swagger_schema.properties[key];
      if (getUploadConfig(def)) return true;
      if (def?.type === 'array') return false;
      if (isNestedRelationProperty(def)) return false;
      return true;
    }
  );

  const renderField = (fieldKey: string) => {
    const def = metadata.swagger_schema.properties[fieldKey];
    const uploadCfg = getUploadConfig(def);
    if (uploadCfg) {
      const eligibilityBlocked =
        resourceName === 'Eligibility' &&
        (resource as any).review_status === 'approved';
      return (
        <ManagerFileUpload
          key={fieldKey}
          label={def.title || fieldKey}
          config={uploadCfg}
          parentId={resourceId}
          value={(isEditing ? editValues[fieldKey] : resource[fieldKey]) as any}
          disabled={saving || eligibilityBlocked}
          onChanged={handleRefresh}
          error={editErrors[fieldKey]}
        />
      );
    }
    if (isEditing) {
      return (
        <ResourceFieldEdit
          key={fieldKey}
          fieldKey={fieldKey}
          fieldValue={editValues[fieldKey] ?? resource[fieldKey]}
          metadata={metadata}
          onChange={handleFieldChange}
          onBlur={() => {}}
          error={editErrors[fieldKey]}
          excludeFields={excludeFields}
          disabled={saving}
        />
      );
    }
    return (
      <ResourceFieldDisplay
        key={fieldKey}
        fieldKey={fieldKey}
        fieldValue={resource[fieldKey]}
        metadata={metadata}
        excludeFields={excludeFields}
        record={resource}
      />
    );
  };

  return wrap(
    <View className="flex-1">
      {!embedded && (
        <View className="flex-row items-center p-4 border-b border-gray-200">
          <Pressable onPress={handleBack} className="mr-3 p-2">
            <Ionicons name="arrow-back" size={24} color="#4b5563" />
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
                <Ionicons name="refresh" size={16} color="#4b5563" />
                <Text className="text-gray-700 text-sm ml-1">Refresh</Text>
              </Pressable>
            )}
            {updateResource && (
              <EditModeToggle
                isEditing={isEditing}
                onEdit={handleEdit}
                onSave={handleSave}
                onCancel={handleCancel}
                loading={saving}
              />
            )}
          </View>
        </View>
      )}

      {embedded && updateResource && (
        <View className="flex-row justify-end mb-3">
          <EditModeToggle
            isEditing={isEditing}
            onEdit={handleEdit}
            onSave={handleSave}
            onCancel={handleCancel}
            loading={saving}
            showSave={externalChrome ? false : showSave}
          />
        </View>
      )}

      {embedded ? (
        <View className="p-4">
          <View className="mb-8">
            <Text className="text-xl font-semibold text-gray-900 mb-4">
              {resourceDisplayName} Information
            </Text>
            <View className="bg-white border rounded-lg p-4">
              {fieldKeys.map(fieldKey => renderField(fieldKey))}
            </View>
          </View>
          {showLinkedEntities &&
            linkedEntities.map(linkedEntity => (
              <LinkedEntitySection
                key={linkedEntity.key}
                config={linkedEntity}
                parentId={resourceId!}
              />
            ))}
        </View>
      ) : (
        <ScrollView className="flex-1 p-4">
          <View className="mb-8">
            <Text className="text-xl font-semibold text-gray-900 mb-4">
              {resourceDisplayName} Information
            </Text>
            <View className="bg-white border rounded-lg p-4">
              {fieldKeys.map(fieldKey => renderField(fieldKey))}
            </View>
          </View>
          {showLinkedEntities &&
            linkedEntities.map(linkedEntity => (
              <LinkedEntitySection
                key={linkedEntity.key}
                config={linkedEntity}
                parentId={resourceId!}
              />
            ))}
        </ScrollView>
      )}
    </View>
  );
}
