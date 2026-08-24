/**
 * Reusable Resource View Page Component
 * Generic component for displaying individual resource details with linked entities
 */

import {
  useHasPageChrome,
  useRegisterPageActions,
} from '@/components/chrome/PageChromeProvider';
import AppLayout from '@/components/layout/AppLayout';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import HeaderActionButton from '@/components/ui/HeaderActionButton';
import ManagerFileUpload from '@/components/ui/ManagerFileUpload';
import { useResourceMetadata } from '@/hooks/useResourceMetadata';
import { ResourceViewPageProps } from '@/types/ui/pages';
import { formatField } from '@/utils/fieldFormatter';
import { getResourceDisplayLabel, formatResourceHeaderTitle } from '@/utils/getResourceDisplayLabel';
import { buildResourceBreadcrumbs } from '@/utils/buildResourceBreadcrumbs';
import { LinkedEntityService } from '@/utils/linkedEntityService';
import { isNestedRelationProperty } from '@/utils/nestedRelationProperty';
import { getUploadConfig } from '@/utils/uploadMetadata';
import { validateFormWithSubmission } from '@/utils/validationRules';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import LoadingSpinner from '../ui/LoadingSpinner';
import EditModeToggle from './EditModeToggle';
import LinkedEntitySection from './LinkedEntitySection';
import ResourceFieldDisplay from './ResourceFieldDisplay';
import ResourceFieldEdit from './ResourceFieldEdit';
import ResourceSubHeader from './ResourceSubHeader';

const EMPTY_EXCLUDE_LINKED_ENTITIES: readonly string[] = [];

export default function ResourceViewPage<
  T extends { [key: string]: any } = any,
>({ config }: ResourceViewPageProps<T>) {
  const params = useLocalSearchParams<{ id: string }>();
  const hasPageChrome = useHasPageChrome();

  const {
    resourceName,
    resourceDisplayName,
    fetchResource,
    updateResource,
    excludeFields = [],
    title,
    description,
    sectionLabel,
    sectionHref,
    subHeader,
    embedded = false,
    resourceIdOverride = null,
    showLinkedEntities: showLinkedEntitiesProp,
    excludeLinkedEntities,
    externalChrome = false,
    showSave = true,
    onChromeStateChange,
  } = config;

  const resolvedExcludeLinked =
    excludeLinkedEntities ?? EMPTY_EXCLUDE_LINKED_ENTITIES;

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
    () => new Set(resolvedExcludeLinked),
    [resolvedExcludeLinked]
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

  const fetchMetadataRef = useRef(fetchMetadata);
  const getMetadataRef = useRef(getMetadata);
  fetchMetadataRef.current = fetchMetadata;
  getMetadataRef.current = getMetadata;

  const metadata = getMetadata(resourceName);
  const metadataError = getError(resourceName);
  const metadataLoading = isLoading(resourceName);

  const displayLabel = useMemo(
    () => getResourceDisplayLabel(metadata, resource, resourceId),
    [metadata, resource, resourceId]
  );

  const breadcrumbItems = useMemo(
    () =>
      buildResourceBreadcrumbs({
        sectionLabel: sectionLabel || title || resourceDisplayName,
        sectionHref: sectionHref || '/',
        leaf: displayLabel,
      }),
    [displayLabel, resourceDisplayName, sectionHref, sectionLabel, title]
  );

  useBreadcrumbSegments(
    `resource-view-${resourceName}-${resourceId ?? 'pending'}`,
    embedded ? [] : breadcrumbItems
  );

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
    let cancelled = false;

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
                await fetchMetadataRef.current(linkedResourceName);
                return getMetadataRef.current(linkedResourceName);
              }
            );
          if (cancelled) return;
          setLinkedEntities(
            detectedEntities.filter(e => !excludedLinkedKeys.has(e.key))
          );
        } catch {
          if (cancelled) return;
          setLinkedEntities([]);
        }
      };
      void detectLinkedEntities();
    } else if (!showLinkedEntities) {
      setLinkedEntities(prev => (prev.length === 0 ? prev : []));
    }

    return () => {
      cancelled = true;
    };
  }, [
    metadata,
    resourceId,
    resourceName,
    showLinkedEntities,
    excludedLinkedKeys,
  ]);

  const handleRefresh = useCallback(() => {
    void loadResource();
  }, [loadResource]);

  const handleEdit = useCallback(() => {
    if (resource) {
      setEditValues({ ...resource });
      setEditErrors({});
      setIsEditing(true);
    }
  }, [resource]);

  const handleCancel = useCallback(() => {
    setEditValues({});
    setEditErrors({});
    setIsEditing(false);
  }, []);

  const handleSave = useCallback(async () => {
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
  }, [editValues, metadata, resourceId, updateResource]);

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

  const isDirty = useMemo(
    () =>
      isEditing &&
      JSON.stringify(editValues) !== JSON.stringify(resource ?? {}),
    [editValues, isEditing, resource]
  );

  useEffect(() => {
    if (!onChromeStateChange) return;
    onChromeStateChange({
      save: handleSave,
      refresh: handleRefresh,
      ...(updateResource
        ? { edit: handleEdit, cancel: handleCancel }
        : {}),
      isEditing: !!updateResource && isEditing,
      isSaving: saving,
      canSave: !!updateResource && isEditing,
      isDirty,
      displayTitle: displayLabel,
    });
  }, [
    onChromeStateChange,
    isEditing,
    saving,
    updateResource,
    isDirty,
    displayLabel,
    handleSave,
    handleRefresh,
    handleEdit,
    handleCancel,
  ]);

  const editModeToggle = updateResource ? (
    <EditModeToggle
      isEditing={isEditing}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
      loading={saving}
      showSave={externalChrome ? false : showSave}
    />
  ) : null;

  const standaloneHeaderActions = (
    <>
      {!isEditing ? (
        <HeaderActionButton
          label="Refresh"
          icon="refresh"
          onPress={handleRefresh}
          testID="resource-view-refresh"
        />
      ) : null}
      {editModeToggle}
    </>
  );

  const embeddedHeaderActions = useMemo(
    () =>
      updateResource && !externalChrome ? (
        <>
          {!isEditing ? (
            <HeaderActionButton
              label="Refresh"
              icon="refresh"
              onPress={handleRefresh}
              testID="resource-view-refresh"
            />
          ) : null}
          {editModeToggle}
        </>
      ) : null,
    [editModeToggle, externalChrome, handleRefresh, isEditing, updateResource]
  );

  const embeddedHeaderActionsKey = `${isEditing ? 1 : 0}-${saving ? 1 : 0}`;

  useRegisterPageActions(
    embedded
      ? externalChrome
        ? null
        : hasPageChrome
          ? {
              refresh: handleRefresh,
              edit: updateResource ? handleEdit : undefined,
              cancel: updateResource ? handleCancel : undefined,
              save: updateResource ? handleSave : undefined,
              isEditing: !!updateResource && isEditing,
              isSaving: saving,
              canSave: !!updateResource && isEditing,
              isDirty,
              displayTitle: displayLabel,
              headerActions: embeddedHeaderActions,
              headerActionsKey: embeddedHeaderActionsKey,
            }
          : null
      : null
  );

  const showInlineEditToggle =
    embedded &&
    updateResource &&
    !externalChrome &&
    !hasPageChrome &&
    editModeToggle;

  const wrap = (children: React.ReactNode) =>
    embedded ? (
      <View className="flex-1">{children}</View>
    ) : (
      <AppLayout
        title={formatResourceHeaderTitle(resourceDisplayName, displayLabel)}
        description={description}
        headerActions={standaloneHeaderActions}
      >
        {children}
      </AppLayout>
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

  const fieldCard = (
    <View className="bg-white border rounded-lg p-4">
      {fieldKeys.map(fieldKey => renderField(fieldKey))}
    </View>
  );

  const linkedSections =
    showLinkedEntities &&
    linkedEntities.map(linkedEntity => (
      <LinkedEntitySection
        key={linkedEntity.key}
        config={linkedEntity}
        parentId={resourceId!}
      />
    ));

  return wrap(
    <View className="flex-1">
      {subHeader ? (
        <ResourceSubHeader
          title={subHeader.title}
          description={subHeader.description}
          actions={subHeader.actions}
        />
      ) : null}

      {showInlineEditToggle ? (
        <View className="flex-row justify-end px-4 pt-3">
          {editModeToggle}
        </View>
      ) : null}

      {embedded ? (
        <View className="flex-1 p-4">
          <View className="mb-8">{fieldCard}</View>
          {linkedSections}
        </View>
      ) : (
        <View className="flex-1 p-4">
          <View className="mb-8">{fieldCard}</View>
          {linkedSections}
        </View>
      )}
    </View>
  );
}
