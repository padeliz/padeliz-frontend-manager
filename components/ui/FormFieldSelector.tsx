/**
 * Form Field Selector Component
 * FK selection via floating modal dropdown (not in-tree absolute menu).
 */

import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import { FormFieldSelectorProps } from '@/types/utils/field-formatter';
import { ForeignKeyService } from '@/utils/foreignKeyService';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

interface SelectorOption {
  id: number;
  label: string;
}

export default function FormFieldSelector({
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

  const linkedResourceInfo = ForeignKeyService.getLinkedResourceInfo(
    fieldKey,
    metadata
  );

  const loadOptions = useCallback(async () => {
    if (!linkedResourceInfo) return;
    try {
      setLoading(true);
      const fetchedOptions = await linkedResourceInfo.fetchOptions();
      setOptions(fetchedOptions);
    } catch (e) {
      console.error('Error loading options:', e);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [linkedResourceInfo]);

  useEffect(() => {
    if (linkedResourceInfo) {
      void loadOptions();
    }
  }, [linkedResourceInfo, loadOptions]);

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
