/**
 * Form Field Selector Component
 * FK selection via floating modal dropdown (not in-tree absolute menu).
 * User FKs use the shared async searchable picker; other FKs use static options.
 */

import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import UserForeignKeySelector, {
  resolveUserFkRole,
} from '@/components/ui/UserForeignKeySelector';
import { FormFieldSelectorProps } from '@/types/utils/field-formatter';
import { ForeignKeyService } from '@/utils/foreignKeyService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

interface SelectorOption {
  id: number;
  label: string;
}

function StaticForeignKeySelector({
  fieldKey,
  fieldValue,
  metadata,
  onChange,
  onBlur,
  error,
  disabled = false,
  placeholder,
}: FormFieldSelectorProps) {
  const [options, setOptions] = useState<SelectorOption[]>([]);
  const [loading, setLoading] = useState(false);

  const relatedSchemaName =
    metadata.filterable_fields?.[fieldKey]?.related_schema_name ?? null;
  const relatedSchemaField =
    metadata.filterable_fields?.[fieldKey]?.related_schema_field ?? null;

  useEffect(() => {
    // Resolve inside the effect so deps stay stable (getLinkedResourceInfo
    // returns a new object every call and must not be an effect dependency).
    const linkedResourceInfo = ForeignKeyService.getLinkedResourceInfo(
      fieldKey,
      metadata
    );
    if (!linkedResourceInfo) return;

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const fetchedOptions = await linkedResourceInfo.fetchOptions();
        if (cancelled) return;
        setOptions(fetchedOptions);
      } catch (e) {
        console.error('Error loading options:', e);
        if (cancelled) return;
        setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fieldKey, metadata, relatedSchemaName, relatedSchemaField]);

  const dropdownOptions = useMemo(
    () =>
      options.map(o => ({
        value: o.id,
        label: o.label,
      })),
    [options]
  );

  const selectedValue =
    fieldValue === null || fieldValue === undefined || fieldValue === ''
      ? null
      : Number(fieldValue);

  const displayPlaceholder =
    placeholder ||
    (loading
      ? 'Loading…'
      : `Select ${fieldKey.replace(/_id$/, '').replace(/_/g, ' ')}`);

  return (
    <View>
      <SingleSelectDropdown
        options={dropdownOptions}
        selectedValue={
          selectedValue != null && Number.isFinite(selectedValue)
            ? selectedValue
            : null
        }
        onSelectionChange={v => {
          const n = Number(v);
          onChange(Number.isFinite(n) ? n : null);
          onBlur?.();
        }}
        placeholder={displayPlaceholder}
        title={displayPlaceholder}
        disabled={disabled || loading}
        minWidth={280}
      />
      {error && (
        <View className="flex-row items-center mt-1">
          <Ionicons
            name="alert-circle"
            size={16}
            className="text-red-500 mr-1"
          />
          <Text className="text-sm text-red-600">{error}</Text>
        </View>
      )}
    </View>
  );
}

export default function FormFieldSelector(props: FormFieldSelectorProps) {
  const { fieldKey, metadata } = props;
  const filterMeta = metadata.filterable_fields?.[fieldKey];
  const relatedSchema = filterMeta?.related_schema_name;

  if (relatedSchema === 'User') {
    const role = resolveUserFkRole(fieldKey, filterMeta?.related_user_role);
    return (
      <UserForeignKeySelector
        role={role}
        fieldKey={fieldKey}
        fieldValue={props.fieldValue}
        onChange={props.onChange}
        onBlur={props.onBlur}
        error={props.error}
        disabled={props.disabled}
        placeholder={props.placeholder}
      />
    );
  }

  return <StaticForeignKeySelector {...props} />;
}
