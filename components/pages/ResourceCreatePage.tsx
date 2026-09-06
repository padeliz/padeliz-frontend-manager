/**
 * Resource Create Page — metadata-driven create with create-then-attach uploads.
 */

import AppLayout from '@/components/layout/AppLayout';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import ActionButton from '@/components/ui/ActionButton';
import ManagerFileUpload, {
  PendingUploadFile,
  uploadPendingFiles,
} from '@/components/ui/ManagerFileUpload';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { useResourceMetadata } from '@/hooks/useResourceMetadata';
import { ResourceCreatePageProps } from '@/types/ui/pages';
import { buildResourceBreadcrumbs } from '@/utils/buildResourceBreadcrumbs';
import { formatField } from '@/utils/fieldFormatter';
import { isNestedRelationProperty } from '@/utils/nestedRelationProperty';
import { PrimaryKeyService } from '@/utils/primaryKeyService';
import { seedFormValuesFromQuery } from '@/utils/seedFormValuesFromQuery';
import { getUploadConfig } from '@/utils/uploadMetadata';
import { validateFormWithSubmission } from '@/utils/validationRules';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import ResourceFieldEdit from './ResourceFieldEdit';
import ResourceSubHeader from './ResourceSubHeader';

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
    sectionLabel,
    sectionHref,
    subHeader,
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
  const saveStatus = useActionButtonStatus({ auditoryFeedback: true });

  const { getMetadata, getError, isLoading } = useResourceMetadata([
    resourceName,
  ]);
  const metadata = getMetadata(resourceName);
  const metadataError = getError(resourceName);
  const metadataLoading = isLoading(resourceName);

  const breadcrumbItems = useMemo(
    () =>
      buildResourceBreadcrumbs({
        sectionLabel: sectionLabel || title,
        sectionHref: sectionHref || '/',
        leaf: 'Add',
      }),
    [sectionHref, sectionLabel, title]
  );

  useBreadcrumbSegments(`resource-create-${resourceName}`, breadcrumbItems);

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

  const handleSave = async (): Promise<void> => {
    if (!metadata || !createResource) {
      throw new Error('Create functionality not available');
    }
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
        throw new Error('Validation failed');
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
          const pathError = new Error(
            'Created but could not determine view path'
          );
          setError(pathError.message);
          throw pathError;
        }
        router.replace(path as any);
        return;
      }

      const idError = new Error(
        'Created but could not determine new resource id'
      );
      setError(idError.message);
      throw idError;
    } catch (err: any) {
      if (err.errors && typeof err.errors === 'object') {
        setErrors(err.errors);
      } else {
        setError(err.message || 'Failed to create resource');
      }
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const headerActions = (
    <ActionButton
      label="Save"
      variant="primary"
      status={saveStatus.status}
      errorMessage={saveStatus.errorMessage ?? undefined}
      disabled={saving || metadataLoading || !metadata}
      onPress={() => {
        void saveStatus.run(handleSave);
      }}
      testID="resource-create-save"
    />
  );

  const formBody = (
    <View className="flex-1">
      {subHeader ? (
        <ResourceSubHeader
          title={subHeader.title}
          description={subHeader.description}
          actions={subHeader.actions}
        />
      ) : null}

      <View className="flex-1 p-4">
        {error || mediaWarning ? (
          <Text
            className={`text-sm p-2 rounded mb-3 ${
              error ? 'text-red-600 bg-red-50' : 'text-amber-800 bg-amber-50'
            }`}
          >
            {error || mediaWarning}
          </Text>
        ) : null}

        <View className="bg-white border rounded-lg p-4">
          {fieldKeys.map(fieldKey => {
            const def = metadata!.swagger_schema.properties[fieldKey];
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

            if (def.readOnly) return null;
            if (def.type === 'array' || def.type === 'object') return null;

            return (
              <ResourceFieldEdit
                key={fieldKey}
                fieldKey={fieldKey}
                fieldValue={values[fieldKey]}
                metadata={metadata!}
                onChange={handleFieldChange}
                onBlur={() => {}}
                error={errors[fieldKey]}
                excludeFields={excludeFields}
                disabled={saving}
              />
            );
          })}
        </View>
      </View>
    </View>
  );

  if (metadataLoading) {
    return (
      <AppLayout title={title} description={description} headerActions={headerActions}>
        <View className="flex-1 justify-center items-center p-6">
          <LoadingSpinner text="Loading form..." />
        </View>
      </AppLayout>
    );
  }

  if (metadataError || !metadata) {
    return (
      <AppLayout title={title} description={description} headerActions={headerActions}>
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-red-600">
            {metadataError || 'Metadata missing'}
          </Text>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={title} description={description} headerActions={headerActions}>
      {formBody}
    </AppLayout>
  );
}
