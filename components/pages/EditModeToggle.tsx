/**
 * Edit Mode Toggle Component
 * Handles switching between view and edit modes
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

export interface EditModeToggleProps {
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** When false, hide Save (parent chrome owns it). Default true. */
  showSave?: boolean;
}

export default function EditModeToggle({
  isEditing,
  onEdit,
  onSave,
  onCancel,
  loading = false,
  disabled = false,
  showSave = true,
}: EditModeToggleProps) {
  if (isEditing) {
    return (
      <View className="flex-row space-x-2">
        <Pressable
          onPress={onCancel}
          disabled={loading || disabled}
          className={`px-4 py-2 rounded-lg border ${
            loading || disabled
              ? 'bg-gray-100 border-gray-300'
              : 'bg-white border-gray-300'
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              loading || disabled ? 'text-gray-400' : 'text-gray-700'
            }`}
          >
            Cancel
          </Text>
        </Pressable>

        {showSave && (
          <Pressable
            onPress={onSave}
            disabled={loading || disabled}
            className={`px-4 py-2 rounded-lg ${
              loading || disabled ? 'bg-gray-300' : 'bg-blue-600'
            } flex-row items-center`}
          >
            {loading && (
              <View className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            )}
            <Ionicons name="checkmark" size={16} className="text-white mr-1" />
            <Text className="text-white text-sm font-medium">
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onEdit}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg ${
        disabled ? 'bg-gray-300' : 'bg-blue-600'
      } flex-row items-center`}
    >
      <Ionicons name="create-outline" size={16} className="text-white mr-1" />
      <Text className="text-white text-sm font-medium">Edit</Text>
    </Pressable>
  );
}
