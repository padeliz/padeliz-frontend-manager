/**
 * Async searchable User FK selector (player vs manager directory).
 * Always calls useUserPicker so Rules of Hooks stay valid.
 */

import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import {
  useUserPicker,
  UserPickerRole,
} from '@/hooks/useUserPicker';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

export interface UserForeignKeySelectorProps {
  role: UserPickerRole;
  fieldKey: string;
  fieldValue: any;
  onChange: (value: any) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

export default function UserForeignKeySelector({
  role,
  fieldKey,
  fieldValue,
  onChange,
  onBlur,
  error,
  disabled = false,
  placeholder,
}: UserForeignKeySelectorProps) {
  const selectedValue =
    fieldValue === null || fieldValue === undefined || fieldValue === ''
      ? null
      : Number(fieldValue);

  const picker = useUserPicker({
    role,
    selectedValue:
      selectedValue != null && Number.isFinite(selectedValue)
        ? selectedValue
        : null,
  });

  const displayPlaceholder =
    placeholder ||
    (picker.loading
      ? 'Loading…'
      : `Search ${role === 'manager' ? 'manager' : 'player'}…`);

  return (
    <View testID={`user-fk-selector-${fieldKey}`}>
      <SingleSelectDropdown
        options={picker.options}
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
        disabled={disabled}
        searchable
        onSearch={picker.onSearch}
        loading={picker.loading}
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

export function resolveUserFkRole(
  fieldKey: string,
  relatedUserRole?: 'player' | 'manager' | null
): UserPickerRole {
  if (relatedUserRole === 'manager' || relatedUserRole === 'player') {
    return relatedUserRole;
  }
  return fieldKey.includes('manager') ? 'manager' : 'player';
}
