/**
 * Options management for select-type player custom fields.
 */

import ActionButton from '@/components/ui/ActionButton';
import AppTextInput from '@/components/ui/AppTextInput';
import { useToast } from '@/context/ToastContext';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { PlayerCustomFieldsApiService } from '@/services/api/playerCustomFieldsApi';
import { ApiPlayerCustomFieldOption } from '@/types/api/entities';
import { confirmAction } from '@/utils/confirmAction';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Switch,
  Text,
  View,
} from 'react-native';

const api = new PlayerCustomFieldsApiService();

type Props = {
  fieldId: number;
};

/**
 * Per-row mutations own their status hook so a press only reports pending /
 * success / error on the row that was pressed.
 */
function SaveOptionButton({
  option,
  onSave,
}: {
  option: ApiPlayerCustomFieldOption;
  onSave: (option: ApiPlayerCustomFieldOption) => Promise<void>;
}) {
  const { status, errorMessage, run } = useActionButtonStatus({
    auditoryFeedback: true,
  });

  return (
    <ActionButton
      testID={`custom-field-option-save-${option.id_player_custom_field_option}`}
      label="Save"
      variant="primary"
      size="sm"
      status={status}
      errorMessage={errorMessage ?? undefined}
      onPress={() => void run(() => onSave(option))}
    />
  );
}

function DeleteOptionButton({
  option,
  onDelete,
}: {
  option: ApiPlayerCustomFieldOption;
  onDelete: (option: ApiPlayerCustomFieldOption) => Promise<void>;
}) {
  const { status, errorMessage, run } = useActionButtonStatus({
    auditoryFeedback: true,
  });

  return (
    <ActionButton
      testID={`custom-field-option-delete-${option.id_player_custom_field_option}`}
      label="Delete"
      variant="danger"
      size="sm"
      status={status}
      errorMessage={errorMessage ?? undefined}
      onPress={() => {
        confirmAction(
          'Delete option',
          `Delete option "${option.label}"?`,
          () => {
            void run(() => onDelete(option));
          }
        );
      }}
    />
  );
}

export default function PlayerCustomFieldOptionsPanel({ fieldId }: Props) {
  const { showSuccess, showError } = useToast();
  const [options, setOptions] = useState<ApiPlayerCustomFieldOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const addStatus = useActionButtonStatus({ auditoryFeedback: true });

  const loadOptions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getOptions(fieldId);
      setOptions(response.data ?? []);
    } catch (err: any) {
      showError('Load failed', err?.message || 'Could not load options');
    } finally {
      setLoading(false);
    }
  }, [fieldId]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const onAdd = async () => {
    const label = newLabel.trim();
    if (!label) {
      throw new Error('Enter an option label first.');
    }
    try {
      await api.createOption(fieldId, { label });
    } catch (err: any) {
      showError('Add failed', err?.message || 'Could not add option');
      throw err;
    }
    setNewLabel('');
    showSuccess('Option added', 'Custom field option created');
    await loadOptions();
  };

  const onSaveLabel = async (option: ApiPlayerCustomFieldOption) => {
    const label = editLabel.trim();
    if (!label) {
      throw new Error('Enter an option label first.');
    }
    try {
      await api.updateOption(fieldId, option.id_player_custom_field_option, {
        label,
        sort_order: option.sort_order,
        is_active: option.is_active,
      });
    } catch (err: any) {
      showError('Update failed', err?.message || 'Could not update option');
      throw err;
    }
    setEditingId(null);
    showSuccess('Updated', 'Option label saved');
    await loadOptions();
  };

  const onToggleActive = async (option: ApiPlayerCustomFieldOption) => {
    setBusy(true);
    try {
      await api.updateOption(fieldId, option.id_player_custom_field_option, {
        label: option.label,
        sort_order: option.sort_order,
        is_active: !option.is_active,
      });
      await loadOptions();
    } catch (err: any) {
      showError('Update failed', err?.message || 'Could not toggle option');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (option: ApiPlayerCustomFieldOption) => {
    try {
      await api.deleteOption(fieldId, option.id_player_custom_field_option);
    } catch (err: any) {
      showError('Delete failed', err?.message || 'Could not delete option');
      throw err;
    }
    showSuccess('Deleted', 'Option removed');
    await loadOptions();
  };

  if (loading) {
    return (
      <View
        className="p-4 items-center"
        testID="player-custom-field-options-loading"
      >
        <ActivityIndicator size="small" />
      </View>
    );
  }

  return (
    <View className="p-4" testID="player-custom-field-options-panel">
      <Text className="text-xl font-semibold text-gray-900 mb-4">Options</Text>

      <View className="flex-row items-center gap-2 mb-4">
        <AppTextInput
          testID="custom-field-option-new-label"
          value={newLabel}
          onChangeText={setNewLabel}
          placeholder="New option label"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-white"
          editable={!busy}
        />
        <ActionButton
          testID="custom-field-option-add"
          label="Add"
          variant="primary"
          disabled={!newLabel.trim()}
          disabledReason="Enter an option label first."
          status={addStatus.status}
          errorMessage={addStatus.errorMessage ?? undefined}
          onPress={() => void addStatus.run(onAdd)}
        />
      </View>

      {options.length === 0 ? (
        <Text className="text-gray-500">No options yet.</Text>
      ) : (
        options.map(option => (
          <View
            key={option.id_player_custom_field_option}
            testID={`custom-field-option-${option.id_player_custom_field_option}`}
            className="border border-gray-200 rounded-lg p-3 mb-2 bg-white"
          >
            <View className="flex-row flex-wrap items-center gap-2">
              {editingId === option.id_player_custom_field_option ? (
                <>
                  <AppTextInput
                    testID={`custom-field-option-edit-${option.id_player_custom_field_option}`}
                    value={editLabel}
                    onChangeText={setEditLabel}
                    className="flex-1 border border-gray-300 rounded-lg px-2 py-1 min-w-[160px]"
                  />
                  <SaveOptionButton option={option} onSave={onSaveLabel} />
                  <Pressable
                    testID={`custom-field-option-cancel-${option.id_player_custom_field_option}`}
                    onPress={() => setEditingId(null)}
                    className="bg-gray-100 rounded px-2 py-1"
                  >
                    <Text className="text-gray-700 text-xs">Cancel</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text className="text-sm font-medium text-gray-900 flex-1">
                    {option.label}
                  </Text>
                  <Text className="text-xs text-gray-500">{option.code}</Text>
                  <Pressable
                    testID={`custom-field-option-edit-btn-${option.id_player_custom_field_option}`}
                    disabled={busy}
                    onPress={() => {
                      setEditingId(option.id_player_custom_field_option);
                      setEditLabel(option.label);
                    }}
                    className="bg-gray-100 rounded px-2 py-1"
                  >
                    <Text className="text-gray-700 text-xs">Edit</Text>
                  </Pressable>
                </>
              )}

              <View className="flex-row items-center">
                <Text className="text-xs text-gray-600 mr-2">Active</Text>
                <Switch
                  testID={`custom-field-option-active-${option.id_player_custom_field_option}`}
                  value={option.is_active}
                  disabled={busy}
                  onValueChange={() => void onToggleActive(option)}
                />
              </View>

              <DeleteOptionButton option={option} onDelete={onDelete} />
            </View>
          </View>
        ))
      )}
    </View>
  );
}
