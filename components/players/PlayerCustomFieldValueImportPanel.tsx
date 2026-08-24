/**
 * CSV custom field value import review table.
 */

import { useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import CsvFilePicker from '@/components/players/CsvFilePicker';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import { useToast } from '@/context/ToastContext';
import { playerToDropdownOption, usePlayerPicker } from '@/hooks/usePlayerPicker';
import { EditionsApiService } from '@/services/api/editionsApi';
import { ApiError } from '@/services/api/baseApi';
import {
  PlayerCustomFieldValueImportApiService,
  PlayerCustomFieldValueImportSaveRow,
} from '@/services/api/playerCustomFieldValueImportApi';
import {
  ApiPlayer,
  ApiPlayerCustomFieldValueImportPreviewRow,
} from '@/types/api/entities';
import { DropdownOption } from '@/types/ui/dropdowns';
import { confirmDiscardDirty } from '@/utils/softDirtyNav';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';

const api = new PlayerCustomFieldValueImportApiService();
const editionsApi = new EditionsApiService();

type DraftRow = ApiPlayerCustomFieldValueImportPreviewRow & {
  player_id: number | null;
  seedOptions: DropdownOption[];
  errors: string[];
};

function seedOptionsFromPreview(
  row: ApiPlayerCustomFieldValueImportPreviewRow
): DropdownOption[] {
  const players: ApiPlayer[] = [];
  if (row.mapping.player) players.push(row.mapping.player);
  players.push(...(row.mapping.candidates || []));
  players.push(...(row.mapping.name_matches || []));
  const seen = new Set<number>();
  const options: DropdownOption[] = [];
  for (const player of players) {
    if (seen.has(player.id_player)) continue;
    seen.add(player.id_player);
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

function formatAnswers(answers: Record<string, string>): string {
  const entries = Object.entries(answers);
  if (entries.length === 0) return '—';
  return entries.map(([code, value]) => `${code}: ${value}`).join(' · ');
}

export default function PlayerCustomFieldValueImportPanel() {
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<string | null>(null);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [editionId, setEditionId] = useState<number | null>(null);
  const [editionOptions, setEditionOptions] = useState<DropdownOption[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const picker = usePlayerPicker({ selectedValue: null });

  useEffect(() => {
    void (async () => {
      try {
        const response = await editionsApi.getEditions({
          per_page: 100,
          sort_by: { name: 'asc' },
        });
        setEditionOptions(
          (response.data ?? []).map(edition => ({
            label: edition.name,
            value: edition.id_edition,
          }))
        );
      } catch {
        setEditionOptions([]);
      }
    })();
  }, []);

  const applyPreview = useCallback(
    (previewRows: ApiPlayerCustomFieldValueImportPreviewRow[]) => {
      setRows(
        previewRows.map(row => ({
          ...row,
          player_id: row.mapping.player?.id_player ?? null,
          seedOptions: seedOptionsFromPreview(row),
          errors: [],
        }))
      );
      setDirty(false);
    },
    []
  );

  const runPreview = useCallback(
    async (nextFile: File) => {
      setLoading(true);
      try {
        const response = await api.preview(nextFile);
        setFormat(response.data.format);
        applyPreview(response.data.rows);
      } catch (err: any) {
        showError('Preview failed', err?.message || 'Could not preview CSV');
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
      prev.map(row =>
        row.index === index ? { ...row, ...patch, errors: [] } : row
      )
    );
    markDirty();
  };

  const clientValidate = (row: DraftRow): string[] => {
    if (row.player_id != null) return [];
    return ['Select a player for each included row.'];
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
      return;
    }

    const payloadRows: PlayerCustomFieldValueImportSaveRow[] = included.map(
      row => ({
        index: row.index,
        full_name: row.full_name || null,
        email: row.email || null,
        phone: row.phone || null,
        player_id: row.player_id!,
        answers: row.answers,
      })
    );

    setSaving(true);
    try {
      const response = await api.save({
        format,
        filename: file.name,
        edition_id: editionId,
        rows: payloadRows,
      });
      setDirty(false);
      showSuccess('Import saved', response.message || 'Values imported');
      await queryClient.invalidateQueries({
        queryKey: ['resourceList', 'PlayerCustomFieldValueImport'],
      });
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
    } finally {
      setSaving(false);
    }
  }, [editionId, file, format, queryClient, rows, showError, showSuccess]);

  const refresh = useCallback(async () => {
    if (!file) return;
    if (dirty) {
      const ok = await confirmDiscardDirty();
      if (!ok) return;
    }
    await runPreview(file);
  }, [dirty, file, runPreview]);

  const includedOnly = rows.filter(row => row.included);
  const canSave = includedOnly.length > 0 && !!format && !!file && !saving;

  const cancel = useCallback(() => setDirty(false), []);

  useRegisterPageActions({
    save,
    refresh,
    cancel,
    canSave,
    isDirty: dirty,
    isSaving: saving,
  });

  return (
    <View
      className="flex-1 p-4"
      testID="player-custom-field-value-import-panel"
    >
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

      <View className="mb-4 max-w-md" testID="import-edition-select">
        <SingleSelectDropdown
          options={editionOptions}
          selectedValue={editionId}
          onSelectionChange={value =>
            setEditionId(value == null ? null : Number(value))
          }
          placeholder="Edition (optional)"
          title="Edition"
          clearable
        />
      </View>

      {rows.length === 0 ? (
        <Text className="text-gray-500">
          Choose a CSV to preview custom field value rows.
        </Text>
      ) : (
        <View>
          {rows.map(row => {
            const options = mergeOptions(row.seedOptions, picker.options);
            return (
              <View
                key={row.index}
                testID={`cf-import-row-${row.index}`}
                className="border border-gray-200 rounded-lg p-3 mb-3 bg-white"
              >
                <View className="flex-row items-center mb-2">
                  <Text className="text-sm text-gray-600 mr-2">Include</Text>
                  <Switch
                    testID={`cf-import-include-${row.index}`}
                    value={row.included}
                    onValueChange={value =>
                      updateRow(row.index, { included: value })
                    }
                  />
                  <Text className="ml-3 text-xs text-gray-500">
                    {row.mapping.status}
                  </Text>
                </View>

                <Text className="text-sm text-gray-800 mb-1">
                  {row.full_name || '—'}
                </Text>
                <Text className="text-xs text-gray-500 mb-1">
                  {row.email || '—'} · {row.phone || '—'}
                </Text>
                <Text
                  testID={`cf-import-answers-${row.index}`}
                  className="text-xs text-gray-700 mb-2"
                >
                  {formatAnswers(row.answers)}
                </Text>

                <View testID={`cf-import-player-${row.index}`} className="min-w-[220px]">
                  <SingleSelectDropdown
                    options={options}
                    selectedValue={row.player_id}
                    onSelectionChange={value =>
                      updateRow(row.index, {
                        player_id: value == null ? null : Number(value),
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

                {row.errors.map(message => (
                  <Text
                    key={message}
                    testID={`cf-import-error-${row.index}`}
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
