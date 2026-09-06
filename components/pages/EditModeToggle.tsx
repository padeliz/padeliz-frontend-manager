/**
 * Edit Mode Toggle Component
 * Handles switching between view and edit modes
 */

import ActionButton from '@/components/ui/ActionButton';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import React from 'react';
import { View } from 'react-native';

export interface EditModeToggleProps {
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  /** Disables Cancel while parent reports saving; Save status comes from the hook. */
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
  const saveStatus = useActionButtonStatus({
    successHoldMs: 4000,
    auditoryFeedback: true,
  });
  const saveBusy = saveStatus.status === 'pending';
  const cancelDisabled = loading || disabled || saveBusy;

  if (isEditing) {
    return (
      <View className="flex-row items-center gap-2">
        <ActionButton
          label="Cancel"
          variant="secondary"
          size="sm"
          disabled={cancelDisabled}
          onPress={onCancel}
          testID="edit-mode-cancel"
        />

        {showSave ? (
          <ActionButton
            label="Save"
            variant="primary"
            size="sm"
            startIcon="checkmark"
            status={saveStatus.status}
            errorMessage={saveStatus.errorMessage ?? undefined}
            disabled={disabled}
            onPress={() => {
              void saveStatus.run(() => onSave());
            }}
            testID="edit-mode-save"
          />
        ) : null}
      </View>
    );
  }

  return (
    <ActionButton
      label="Edit"
      variant="primary"
      size="sm"
      startIcon="create-outline"
      disabled={disabled}
      onPress={onEdit}
      testID="edit-mode-edit"
    />
  );
}
