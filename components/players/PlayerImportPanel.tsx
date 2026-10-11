/**
 * Players CSV import review table.
 */

import { useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import AppTextInput from '@/components/ui/AppTextInput';
import CsvFilePicker from '@/components/players/CsvFilePicker';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import { useToast } from '@/context/ToastContext';
import { playerToDropdownOption, usePlayerPicker } from '@/hooks/usePlayerPicker';
import { queryKeys } from '@/lib/queryClient';
import { ApiError } from '@/services/api/baseApi';
import {
  UserImportApiService,
  UserImportSaveRow,
} from '@/services/api/userImportApi';
import {
  ApiPlayer,
  ApiUserImportPreviewRow,
} from '@/types/api/entities';
import { DropdownOption } from '@/types/ui/dropdowns';
import { confirmDiscardDirty } from '@/utils/softDirtyNav';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import {
  Pressable,
  Switch,
  Text,
  View,
} from 'react-native';

const api = new UserImportApiService();

type DraftRow = ApiUserImportPreviewRow & {
  included: boolean;
  player_user_id: number | null;
  seedOptions: DropdownOption[];
  errors: string[];
};

function snapshotLabel(row: {
  first_name: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  player_user_id?: number | null;
}): string {
  const name = [row.first_name, row.middle_name, row.last_name]
    .filter(part => part != null && part !== '')
    .join(' ');
  if (name) return name;
  return row.player_user_id != null ? `Player #${row.player_user_id}` : 'Player';
}

function seedOptionsFromPreview(row: ApiUserImportPreviewRow): DropdownOption[] {
  const players: ApiPlayer[] = [];
  if (row.mapping.player) players.push(row.mapping.player);
  players.push(...(row.mapping.candidates || []));
  players.push(...(row.mapping.name_matches || []));
  const seen = new Set<number>();
  const options: DropdownOption[] = [];
  for (const player of players) {
    if (seen.has(player.id_user)) continue;
    seen.add(player.id_user);
    options.push(playerToDropdownOption(player));
  }
  return options;
}

function errorsForIndex(
  errors: Record<string, string[]> | undefined,
  index: number
): string[] {
  if (!errors) return [];
  const prefix = `rows.${index}`;
  return Object.entries(errors)
    .filter(([key]) => key === prefix || key.startsWith(`${prefix}.`))
    .flatMap(([, messages]) => messages);
}

export default function PlayerImportPanel() {
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<string | null>(null);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const includedCount = rows.filter(row => row.included).length;
  const picker = usePlayerPicker({ selectedValue: null });

  const applyPreview = useCallback((previewRows: ApiUserImportPreviewRow[]) => {
    setRows(
      previewRows.map(row => ({
        ...row,
        included: true,
        player_user_id: row.mapping.player?.id_user ?? null,
        seedOptions: seedOptionsFromPreview(row),
        errors: [],
      }))
    );
    setDirty(false);
  }, []);

  const runPreview = useCallback(
    async (nextFile: File, throwOnError = false): Promise<void> => {
      setLoading(true);
      try {
        const response = await api.preview(nextFile);
        setFormat(response.data.format);
        applyPreview(response.data.rows);
      } catch (err: any) {
        showError('Preview failed', err?.message || 'Could not preview CSV');
        if (throwOnError) throw err;
      } finally {
        setLoading(false);
      }
    },
    [applyPreview, showError]
  );

  const onFile = useCallback(
    async (next: File) => {
      setFile(next);
      await runPreview(next);
    },
    [runPreview]
  );

  const markDirty = () => setDirty(true);

  const updateRow = (index: number, patch: Partial<DraftRow>) => {
    setRows(prev =>
      prev.map(row => (row.index === index ? { ...row, ...patch, errors: [] } : row))
    );
    markDirty();
  };

  const clientValidate = (row: DraftRow): string[] => {
    if (row.player_user_id != null) return [];
    const errors: string[] = [];
    if (!row.first_name?.trim()) {
      errors.push('First name is required to create a player.');
    }
    if (!row.email?.trim() && !row.phone?.trim()) {
      errors.push('An email or phone is required to create a player.');
    }
    return errors;
  };

  const save = useCallback(async () => {
    const included = rows.filter(row => row.included);
    if (included.length === 0 || !format || !file) return;

    const nextRows = rows.map(row => {
      if (!row.included) return row;
      return { ...row, errors: clientValidate(row) };
    });
    const blocked = nextRows.some(row => row.included && row.errors.length > 0);
    if (blocked) {
      setRows(nextRows);
      throw new Error('Import validation failed');
    }

    const payloadRows: UserImportSaveRow[] = included.map(row => ({
      index: row.index,
      first_name: row.first_name || null,
      middle_name: row.middle_name,
      last_name: row.last_name,
      email: row.email || null,
      phone: row.phone || null,
      player_user_id: row.player_user_id,
    }));

    setSaving(true);
    try {
      const response = await api.save({
        format,
        filename: file.name,
        rows: payloadRows,
      });
      const saved = response.data.rows || [];
      setRows(prev =>
        prev.map(row => {
          const match = saved.find(item => item.row_index === row.index);
          if (!match?.player_user_id) return { ...row, errors: [] };
          const label = snapshotLabel({
            first_name: match.first_name ?? row.first_name,
            middle_name: match.middle_name ?? row.middle_name,
            last_name: match.last_name ?? row.last_name,
            player_user_id: match.player_user_id,
          });
          const option: DropdownOption = {
            label,
            value: match.player_user_id,
            imageUrl: null,
          };
          const seedOptions = [
            option,
            ...row.seedOptions.filter(opt => Number(opt.value) !== match.player_user_id),
          ];
          return {
            ...row,
            player_user_id: match.player_user_id,
            seedOptions,
            errors: [],
          };
        })
      );
      setDirty(false);
      showSuccess('Import saved', response.message || 'Players imported');
      await queryClient.invalidateQueries({ queryKey: ['resourceList', 'User'] });
      await queryClient.invalidateQueries({
        queryKey: ['resourceList', 'UserImport'],
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.playersPicker() });
    } catch (err: any) {
      if (err instanceof ApiError && err.errors) {
        setRows(prev =>
          prev.map(row => ({
            ...row,
            errors: errorsForIndex(err.errors, row.index),
          }))
        );
      }
      showError('Import failed', err?.message || 'Could not save import');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [file, format, queryClient, rows, showError, showSuccess]);

  const refresh = useCallback(async () => {
    if (!file) return;
    if (dirty) {
      const ok = await confirmDiscardDirty();
      if (!ok) return;
    }
    await runPreview(file, true);
  }, [dirty, file, runPreview]);

  const includedOnly = rows.filter(row => row.included);
  const canSave = includedOnly.length > 0 && !!format && !!file && !saving;

  const cancel = useCallback(() => {
    setDirty(false);
  }, []);

  useRegisterPageActions({
    save,
    refresh,
    cancel,
    canSave,
    isDirty: dirty,
    isSaving: saving,
  });

  return (
    <View className="flex-1 p-4" testID="player-import-panel">
      <View className="flex-row items-center justify-between mb-4">
        <CsvFilePicker
          onFile={onFile}
          disabled={loading || saving}
          filename={file?.name}
        />
        {loading ? (
          <Text className="text-sm text-gray-500">Loading preview…</Text>
        ) : null}
      </View>

      {rows.length === 0 ? (
        <Text className="text-gray-500">Choose a Playtomic CSV to preview rows.</Text>
      ) : (
        <View>
          {rows.map(row => {
            const locked = row.player_user_id != null;
            const options = mergeOptions(row.seedOptions, picker.options);
            return (
              <View
                key={row.index}
                testID={`import-row-${row.index}`}
                className="border border-gray-200 rounded-lg p-3 mb-3 bg-white"
              >
                <View className="flex-row items-center mb-2">
                  <Text className="text-sm text-gray-600 mr-2">Include</Text>
                  <Switch
                    testID={`import-include-${row.index}`}
                    value={row.included}
                    onValueChange={value => updateRow(row.index, { included: value })}
                  />
                  <Text className="ml-3 text-xs text-gray-500">
                    {row.mapping.status}
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  <AppTextInput
                    testID={`import-first-name-${row.index}`}
                    value={row.first_name}
                    editable={!locked}
                    onChangeText={text => updateRow(row.index, { first_name: text })}
                    placeholder="First"
                    className={`border rounded-lg px-2 py-1 w-32 ${locked ? 'bg-gray-100' : 'bg-white'}`}
                  />
                  <AppTextInput
                    testID={`import-middle-name-${row.index}`}
                    value={row.middle_name ?? ''}
                    editable={!locked}
                    onChangeText={text =>
                      updateRow(row.index, { middle_name: text || null })
                    }
                    placeholder="Middle"
                    className={`border rounded-lg px-2 py-1 w-28 ${locked ? 'bg-gray-100' : 'bg-white'}`}
                  />
                  <AppTextInput
                    testID={`import-last-name-${row.index}`}
                    value={row.last_name ?? ''}
                    editable={!locked}
                    onChangeText={text =>
                      updateRow(row.index, { last_name: text || null })
                    }
                    placeholder="Last"
                    className={`border rounded-lg px-2 py-1 w-32 ${locked ? 'bg-gray-100' : 'bg-white'}`}
                  />
                  <AppTextInput
                    testID={`import-phone-${row.index}`}
                    value={row.phone}
                    editable={!locked}
                    onChangeText={text => updateRow(row.index, { phone: text })}
                    placeholder="Phone"
                    className={`border rounded-lg px-2 py-1 w-40 ${locked ? 'bg-gray-100' : 'bg-white'}`}
                  />
                  <AppTextInput
                    testID={`import-email-${row.index}`}
                    value={row.email}
                    editable={!locked}
                    onChangeText={text => updateRow(row.index, { email: text })}
                    placeholder="Email"
                    className={`border rounded-lg px-2 py-1 w-48 ${locked ? 'bg-gray-100' : 'bg-white'}`}
                  />
                  <View testID={`import-player-${row.index}`} className="min-w-[220px]">
                    <SingleSelectDropdown
                      options={options}
                      selectedValue={row.player_user_id}
                      onSelectionChange={value =>
                        updateRow(row.index, {
                          player_user_id: value == null ? null : Number(value),
                        })
                      }
                      placeholder="Map player"
                      title="Player"
                      searchable
                      clearable
                      onSearch={picker.onSearch}
                      loading={picker.loading}
                    />
                  </View>
                </View>
                {row.errors.map(message => (
                  <Text
                    key={message}
                    testID={`import-error-${row.index}`}
                    className="text-red-600 text-sm mt-2"
                  >
                    {message}
                  </Text>
                ))}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function mergeOptions(
  seeded: DropdownOption[],
  searched: DropdownOption[]
): DropdownOption[] {
  const seen = new Set<string>();
  const merged: DropdownOption[] = [];
  for (const option of [...seeded, ...searched]) {
    const key = String(option.value);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(option);
  }
  return merged;
}
