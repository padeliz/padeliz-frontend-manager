/**
 * Resource Create Page — metadata-driven create with create-then-attach uploads.
 */

import AppLayout from '@/components/layout/AppLayout';
import ManagerFileUpload, {
  PendingUploadFile,
  uploadPendingFiles,
} from '@/components/ui/ManagerFileUpload';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useResourceMetadata } from '@/hooks/useResourceMetadata';
import { ResourceCreatePageProps } from '@/types/ui/pages';
import { formatField } from '@/utils/fieldFormatter';
import { isNestedRelationProperty } from '@/utils/nestedRelationProperty';
import { PrimaryKeyService } from '@/utils/primaryKeyService';
import { seedFormValuesFromQuery } from '@/utils/seedFormValuesFromQuery';
import { getUploadConfig } from '@/utils/uploadMetadata';
import { validateFormWithSubmission } from '@/utils/validationRules';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import ResourceFieldEdit from './ResourceFieldEdit';

export default function ResourceCreatePage<
  T extends { [key: string]: any } = any,
>({ config }: ResourceCreatePageProps<T>) {
  const router = useRouter();
  const {
    resourceName,
    resourceDisplayName,
    createResource,
    excludeFields = [],
    title,
    description,
    onBack,
    getViewPath,
    seedFromQuery,
  } = config;

  const searchParams = useLocalSearchParams();
  const seededRef = useRef(false);

  const [values, setValues] = useState<Partial<T>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingByField, setPendingByField] = useState<
    Record<string, PendingUploadFile[]>
  >({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaWarning, setMediaWarning] = useState<string | null>(null);

  const { getMetadata, getError, isLoading } = useResourceMetadata([
    resourceName,
  ]);
  const metadata = getMetadata(resourceName);
  const metadataError = getError(resourceName);
  const metadataLoading = isLoading(resourceName);

  useEffect(() => {
    if (!seedFromQuery || !metadata || seededRef.current) return;
    seededRef.current = true;
    setValues(prev => {
      const next = seedFormValuesFromQuery(
        searchParams as Record<string, any>,
        metadata,
        {
          seedFromQuery,
          excludeFields,
          currentValues: prev,
        }
      );
      if (Object.keys(next).length === 0) return prev;
      return { ...next, ...prev };
    });
  }, [excludeFields, metadata, searchParams, seedFromQuery]);

  const fieldKeys = useMemo(() => {
    if (!metadata?.swagger_schema?.properties) return [];
    return Object.keys(metadata.swagger_schema.properties).filter(key => {
      if (excludeFields.includes(key)) return false;
      const def = metadata.swagger_schema.properties[key];
      if (getUploadConfig(def)) return true;
      if (isNestedRelationProperty(def)) return false;
      if (def?.type === 'array' && !getUploadConfig(def)) return false;
      return true;
    });
  }, [metadata, excludeFields]);

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  const handleFieldChange = (fieldKey: string, value: any) => {
    setValues(prev => ({ ...prev, [fieldKey]: value }));
    if (errors[fieldKey]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[fieldKey];
        return next;
      });
    }
  };

  const handleSave = async () => {
    if (!metadata || !createResource) return;
    setSaving(true);
    setError(null);
    setMediaWarning(null);
    setErrors({});

    try {
      const formattedValues: Record<string, any> = {};
      for (const [fieldKey, value] of Object.entries(values)) {
        const def = metadata.swagger_schema.properties[fieldKey];
        if (getUploadConfig(def)) continue;
        const fieldInfo = formatField({
          metadata,
          fieldKey,
          fieldValue: value,
          mode: 'form',
        });
        formattedValues[fieldKey] = fieldInfo.apiValue;
      }

      const validationResult = validateFormWithSubmission(
        metadata.swagger_schema,
        formattedValues,
        metadata
      );
      if (!validationResult.isValid) {
        const fieldErrors: Record<string, string> = {};
        validationResult.errors.forEach(err => {
          fieldErrors[err.field] = err.message;
        });
        setErrors(fieldErrors);
        return;
      }

      const response = await createResource(formattedValues as Partial<T>);
      const created = response.data;
      const newId = PrimaryKeyService.extractId(created, metadata);

      if (newId != null) {
        const uploadEntries = Object.entries(pendingByField).filter(
          ([, files]) => files.length > 0
        );
        if (uploadEntries.length > 0) {
          try {
            for (const [fieldKey, files] of uploadEntries) {
              const cfg = getUploadConfig(
                metadata.swagger_schema.properties[fieldKey]
              );
              if (!cfg) continue;
              await uploadPendingFiles(cfg, newId, files);
            }
          } catch (uploadErr: any) {
            setMediaWarning(
              uploadErr?.message ||
                'Created but media incomplete — retry uploads on this page.'
            );
          }
        }

        const path =
          getViewPath?.(newId, created) ||
          (metadata.resource_path
            ? `/${metadata.resource_path}/${newId}`
            : null);
        if (!path) {
          setError('Created but could not determine view path');
          return;
        }
        router.replace(path as any);
        return;
      }

      setError('Created but could not determine new resource id');
    } catch (err: any) {
      if (err.errors && typeof err.errors === 'object') {
        setErrors(err.errors);
      } else {
        setError(err.message || 'Failed to create resource');
      }
    } finally {
      setSaving(false);
    }
  };

  if (metadataLoading) {
    return (
      <AppLayout title={title}>
        <View className="flex-1 justify-center items-center p-6">
          <LoadingSpinner text="Loading form..." />
        </View>
      </AppLayout>
    );
  }

  if (metadataError || !metadata) {
    return (
      <AppLayout title={title}>
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-red-600">{metadataError || 'Metadata missing'}</Text>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={title}>
      <View className="flex-1">
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
          <Pressable
            onPress={() => void handleSave()}
            disabled={saving}
            className="bg-blue-600 rounded-lg px-4 py-2"
          >
            <Text className="text-white font-semibold">
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1 p-4">
          {(error || mediaWarning) && (
            <Text
              className={`text-sm p-2 rounded mb-3 ${
                error
                  ? 'text-red-600 bg-red-50'
                  : 'text-amber-800 bg-amber-50'
              }`}
            >
              {error || mediaWarning}
            </Text>
          )}

          <View className="bg-white border rounded-lg p-4">
            <Text className="text-xl font-semibold text-gray-900 mb-4">
              New {resourceDisplayName}
            </Text>
            {fieldKeys.map(fieldKey => {
              const def = metadata.swagger_schema.properties[fieldKey];
              const uploadCfg = getUploadConfig(def);
              if (uploadCfg) {
                return (
                  <ManagerFileUpload
                    key={fieldKey}
                    label={def.title || fieldKey}
                    config={uploadCfg}
                    pendingFiles={pendingByField[fieldKey] || []}
                    onPendingChange={files =>
                      setPendingByField(prev => ({
                        ...prev,
                        [fieldKey]: files,
                      }))
                    }
                    error={errors[fieldKey]}
                    disabled={saving}
                  />
                );
              }

              // Skip readOnly without upload (PK, timestamps, computed)
              if (def.readOnly) return null;
              // Skip nested objects/arrays without upload
              if (def.type === 'array' || def.type === 'object') return null;

              return (
                <ResourceFieldEdit
                  key={fieldKey}
                  fieldKey={fieldKey}
                  fieldValue={values[fieldKey]}
                  metadata={metadata}
                  onChange={handleFieldChange}
                  onBlur={() => {}}
                  error={errors[fieldKey]}
                  excludeFields={excludeFields}
                  disabled={saving}
                />
              );
            })}
          </View>
        </ScrollView>
      </View>
    </AppLayout>
  );
}
