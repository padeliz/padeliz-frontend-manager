/**
 * Bulk profile image import review table.
 */

import { useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import ImageFilesPicker, { PickedImageFile } from '@/components/players/ImageFilesPicker';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import { useToast } from '@/context/ToastContext';
import { playerToDropdownOption, usePlayerPicker } from '@/hooks/usePlayerPicker';
import { queryKeys } from '@/lib/queryClient';
import { ApiError } from '@/services/api/baseApi';
import {
  PlayerProfileImageImportApiService,
  PlayerProfileImageImportSaveRow,
} from '@/services/api/playerProfileImageImportApi';
import { PlayersApiService } from '@/services/api/playersApi';
import {
  ApiPlayer,
  ApiPlayerProfileImageImportPreviewRow,
} from '@/types/api/entities';
import { DropdownOption } from '@/types/ui/dropdowns';
import { confirmDiscardDirty } from '@/utils/softDirtyNav';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';

const api = new PlayerProfileImageImportApiService();
const playersApi = new PlayersApiService();

type PdfPrimaryMode = 'none' | 'locked' | 'checkbox' | 'radio';

type DraftRow = ApiPlayerProfileImageImportPreviewRow & {
  included: boolean;
  player_id: number | null;
  player: ApiPlayer | null;
  is_pdf_primary: boolean;
  pdfPrimaryMode: PdfPrimaryMode;
  pdfPrimaryLocked: boolean;
  seedOptions: DropdownOption[];
  errors: string[];
  objectUrl: string;
};

function seedOptionsFromPreview(row: ApiPlayerProfileImageImportPreviewRow): DropdownOption[] {
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

function existingCount(player: ApiPlayer | null): number {
  return player?.uploaded_profile_images?.length ?? 0;
}

function applyPdfPrimaryRules(rows: DraftRow[]): DraftRow[] {
  const includedByPlayer = new Map<number, DraftRow[]>();
  for (const row of rows) {
    if (!row.included || row.player_id == null) continue;
    const list = includedByPlayer.get(row.player_id) ?? [];
    list.push(row);
    includedByPlayer.set(row.player_id, list);
  }

  const primaryByPlayer = new Map<number, number>();
  for (const [playerId, group] of includedByPlayer) {
    if (group.length >= 2) {
      const flagged = group.filter(r => r.is_pdf_primary);
      const chosen =
        flagged.length === 1
          ? flagged[0].index
          : group.sort((a, b) => a.index - b.index)[0].index;
      primaryByPlayer.set(playerId, chosen);
    }
  }

  return rows.map(row => {
    if (!row.included || row.player_id == null) {
      return {
        ...row,
        is_pdf_primary: false,
        pdfPrimaryMode: 'none',
        pdfPrimaryLocked: false,
      };
    }

    const group = includedByPlayer.get(row.player_id) ?? [];
    const count = existingCount(row.player);

    if (group.length >= 2) {
      const primaryIndex = primaryByPlayer.get(row.player_id)!;
      return {
        ...row,
        is_pdf_primary: row.index === primaryIndex,
        pdfPrimaryMode: 'radio',
        pdfPrimaryLocked: false,
      };
    }

    if (count === 0) {
      return {
        ...row,
        is_pdf_primary: true,
        pdfPrimaryMode: 'locked',
        pdfPrimaryLocked: true,
      };
    }

    return {
      ...row,
      is_pdf_primary: row.is_pdf_primary ?? true,
      pdfPrimaryMode: 'checkbox',
      pdfPrimaryLocked: false,
    };
  });
}

function includedBatchCountForPlayer(rows: DraftRow[], playerId: number): number {
  return rows.filter(r => r.included && r.player_id === playerId).length;
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

export default function PlayerProfileImageImportPanel() {
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const objectUrlsRef = useRef<string[]>([]);
  const [files, setFiles] = useState<PickedImageFile[]>([]);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [maxImagesPerPlayer, setMaxImagesPerPlayer] = useState(3);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const picker = usePlayerPicker({ selectedValue: null });

  const revokeObjectUrls = useCallback(() => {
    for (const url of objectUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    objectUrlsRef.current = [];
  }, []);

  useEffect(() => () => revokeObjectUrls(), [revokeObjectUrls]);

  const applyPreview = useCallback(
    (previewRows: ApiPlayerProfileImageImportPreviewRow[], nextFiles: PickedImageFile[]) => {
      revokeObjectUrls();
      const next: DraftRow[] = previewRows.map((row, i) => {
        const file = nextFiles[i];
        const objectUrl = file?.uri ?? '';
        if (objectUrl.startsWith('blob:')) {
          objectUrlsRef.current.push(objectUrl);
        }
        const player = row.mapping.player ?? null;
        return {
          ...row,
          included: true,
          player_id: player?.id_player ?? null,
          player,
          is_pdf_primary: player != null,
          pdfPrimaryMode: 'none',
          pdfPrimaryLocked: false,
          seedOptions: seedOptionsFromPreview(row),
          errors: [],
          objectUrl,
        };
      });
      setRows(applyPdfPrimaryRules(next));
      setDirty(false);
    },
    [revokeObjectUrls]
  );

  const runPreview = useCallback(
    async (nextFiles: PickedImageFile[]) => {
      setLoading(true);
      try {
        const response = await api.preview({
          filenames: nextFiles.map(f => f.name),
        });
        setMaxImagesPerPlayer(response.data.max_images_per_player);
        applyPreview(response.data.rows, nextFiles);
      } catch (err: any) {
        showError('Preview failed', err?.message || 'Could not preview filenames');
      } finally {
        setLoading(false);
      }
    },
    [applyPreview, showError]
  );

  const onFiles = useCallback(
    async (next: File[]) => {
      setFiles(next);
      await runPreview(next);
    },
    [runPreview]
  );

  const markDirty = () => setDirty(true);

  const setRowsWithPdfRules = useCallback((updater: (prev: DraftRow[]) => DraftRow[]) => {
    setRows(prev => applyPdfPrimaryRules(updater(prev)));
  }, []);

  const fetchPlayerForRow = useCallback(async (playerId: number): Promise<ApiPlayer | null> => {
    try {
      const res = await playersApi.getPlayer(playerId);
      return res.data;
    } catch {
      return null;
    }
  }, []);

  const updateRow = useCallback(
    async (index: number, patch: Partial<DraftRow>) => {
      const playerInPatch = 'player' in patch;
      let playerFetch: ApiPlayer | null | undefined;
      if (patch.player_id != null && !playerInPatch) {
        playerFetch = await fetchPlayerForRow(patch.player_id);
      }

      setRowsWithPdfRules(prev =>
        prev.map(row => {
          if (row.index !== index) return row;

          let nextPlayer = row.player;
          if (patch.player_id === null) {
            nextPlayer = null;
          } else if (playerInPatch) {
            nextPlayer = patch.player ?? null;
          } else if (playerFetch !== undefined) {
            nextPlayer = playerFetch;
          }

          return {
            ...row,
            ...patch,
            player: nextPlayer,
            errors: [],
          };
        })
      );
      markDirty();
    },
    [fetchPlayerForRow, setRowsWithPdfRules]
  );

  const setPdfPrimaryForPlayer = useCallback(
    (playerId: number, rowIndex: number) => {
      setRowsWithPdfRules(prev =>
        prev.map(row => {
          if (!row.included || row.player_id !== playerId) return row;
          return { ...row, is_pdf_primary: row.index === rowIndex };
        })
      );
      markDirty();
    },
    [setRowsWithPdfRules]
  );

  const atCapacity = useCallback(
    (row: DraftRow): boolean => {
      if (!row.included || row.player_id == null) return false;
      const existing = existingCount(row.player);
      const batch = includedBatchCountForPlayer(rows, row.player_id);
      return existing + batch > maxImagesPerPlayer;
    },
    [maxImagesPerPlayer, rows]
  );

  const clientValidate = useCallback((): boolean => {
    let blocked = false;
    const next = rows.map(row => {
      if (!row.included) return { ...row, errors: [] as string[] };
      const errors: string[] = [];
      if (row.player_id == null) {
        errors.push('Select a player for each included row.');
      }
      if (atCapacity(row)) {
        errors.push(
          `This player already has the maximum of ${maxImagesPerPlayer} profile images.`
        );
      }
      if (errors.length) blocked = true;
      return { ...row, errors };
    });
    setRows(next);
    return !blocked;
  }, [atCapacity, maxImagesPerPlayer, rows]);

  const batchLabel = useMemo(() => {
    if (files.length === 0) return '';
    if (files.length === 1) return files[0].name;
    return `${files.length} files`;
  }, [files]);

  const save = useCallback(async () => {
    const included = rows.filter(row => row.included);
    if (included.length === 0 || files.length === 0) return;
    if (!clientValidate()) return;

    const payloadRows: PlayerProfileImageImportSaveRow[] = included.map(row => ({
      index: row.index,
      filename: row.filename,
      player_id: row.player_id!,
      is_pdf_primary: row.is_pdf_primary,
    }));

    const filesByIndex: Record<number, PickedImageFile> = {};
    for (const row of included) {
      const file = files[row.index];
      if (file) filesByIndex[row.index] = file;
    }

    setSaving(true);
    try {
      const response = await api.save({
        original_filename: batchLabel,
        rows: payloadRows,
        filesByIndex,
      });
      setDirty(false);
      showSuccess('Import saved', response.message || 'Profile images imported');
      await queryClient.invalidateQueries({ queryKey: ['resourceList', 'Player'] });
      await queryClient.invalidateQueries({
        queryKey: ['resourceList', 'PlayerProfileImageImport'],
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
    } finally {
      setSaving(false);
    }
  }, [batchLabel, clientValidate, files, queryClient, rows, showError, showSuccess]);

  const refresh = useCallback(async () => {
    if (files.length === 0) return;
    if (dirty) {
      const ok = await confirmDiscardDirty();
      if (!ok) return;
    }
    await runPreview(files);
  }, [dirty, files, runPreview]);

  const includedOnly = rows.filter(row => row.included);
  const canSave =
    includedOnly.length > 0 &&
    files.length > 0 &&
    !saving &&
    !includedOnly.some(atCapacity);

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
    <ScrollView className="flex-1 p-4" testID="player-profile-image-import-panel">
      <View className="flex-row items-center justify-between mb-4">
        <ImageFilesPicker
          onFiles={onFiles}
          disabled={loading || saving}
          label={batchLabel || undefined}
        />
        {loading ? (
          <Text className="text-sm text-gray-500">Loading preview…</Text>
        ) : null}
      </View>

      {rows.length === 0 ? (
        <Text className="text-gray-500">
          Choose image files to preview filename mapping.
        </Text>
      ) : (
        <View>
          {rows.map(row => {
            const options = mergeOptions(row.seedOptions, picker.options);
            const showRadio =
              row.pdfPrimaryMode === 'radio' &&
              row.included &&
              row.player_id != null;
            const showCheckbox =
              row.pdfPrimaryMode === 'checkbox' &&
              row.included &&
              row.player_id != null;
            const showLocked =
              row.pdfPrimaryMode === 'locked' &&
              row.included &&
              row.player_id != null;
            const existingImages = row.player?.uploaded_profile_images ?? [];
            const displayStatus =
              row.player_id != null ? 'mapped' : row.mapping.status;

            return (
              <View
                key={row.index}
                testID={`profile-image-import-row-${row.index}`}
                className="border border-gray-200 rounded-lg p-3 mb-3 bg-white"
              >
                <View
                  testID={`profile-image-row-toolbar-${row.index}`}
                  className="flex-row flex-wrap items-center gap-2"
                >
                  <View className="flex-row items-center">
                    <Text className="text-sm text-gray-600 mr-2">Include</Text>
                    <Switch
                      testID={`profile-image-include-${row.index}`}
                      value={row.included}
                      onValueChange={value => {
                        void updateRow(row.index, { included: value });
                      }}
                    />
                  </View>

                  {row.objectUrl ? (
                    <Image
                      testID={`profile-image-preview-${row.index}`}
                      source={{ uri: row.objectUrl }}
                      style={{ width: 56, height: 56, borderRadius: 8 }}
                    />
                  ) : null}

                  <Text
                    testID={`profile-image-filename-${row.index}`}
                    className="text-sm text-gray-800 flex-shrink min-w-0"
                  >
                    {row.filename}
                  </Text>

                  {showLocked || showCheckbox || showRadio ? (
                    <Text
                      testID={`profile-image-pdf-separator-${row.index}`}
                      className="text-gray-400"
                    >
                      |
                    </Text>
                  ) : null}

                  {showLocked ? (
                    <View className="flex-row items-center" testID={`profile-image-pdf-locked-${row.index}`}>
                      <View className="w-4 h-4 mr-2 rounded border border-blue-600 bg-blue-600 items-center justify-center">
                        <Text className="text-white text-xs">✓</Text>
                      </View>
                      <Text className="text-sm text-gray-700">Use in PDFs</Text>
                    </View>
                  ) : null}

                  {showCheckbox ? (
                    <Pressable
                      testID={`profile-image-pdf-checkbox-${row.index}`}
                      onPress={() =>
                        void updateRow(row.index, {
                          is_pdf_primary: !row.is_pdf_primary,
                        })
                      }
                      className="flex-row items-center"
                    >
                      <View
                        className={`w-4 h-4 mr-2 rounded border items-center justify-center ${
                          row.is_pdf_primary
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-gray-400 bg-white'
                        }`}
                      >
                        {row.is_pdf_primary ? (
                          <Text className="text-white text-xs">✓</Text>
                        ) : null}
                      </View>
                      <Text className="text-sm text-gray-700">Use in PDFs</Text>
                    </Pressable>
                  ) : null}

                  {showRadio ? (
                    <Pressable
                      testID={`profile-image-pdf-radio-${row.index}`}
                      onPress={() => setPdfPrimaryForPlayer(row.player_id!, row.index)}
                      className="flex-row items-center"
                    >
                      <View
                        className={`w-4 h-4 mr-2 rounded-full border items-center justify-center ${
                          row.is_pdf_primary
                            ? 'border-blue-600'
                            : 'border-gray-400'
                        }`}
                      >
                        {row.is_pdf_primary ? (
                          <View className="w-2 h-2 rounded-full bg-blue-600" />
                        ) : null}
                      </View>
                      <Text className="text-sm text-gray-700">Use in PDFs</Text>
                    </Pressable>
                  ) : null}

                  <View
                    testID={`profile-image-player-${row.index}`}
                    className="min-w-[220px] flex-1"
                  >
                    <SingleSelectDropdown
                      options={options}
                      selectedValue={row.player_id}
                      onSelectionChange={value => {
                        const id = value == null ? null : Number(value);
                        void updateRow(
                          row.index,
                          id == null ? { player_id: null } : { player_id: id }
                        );
                      }}
                      placeholder="Map player"
                      title="Player"
                      searchable
                      clearable
                      onSearch={picker.onSearch}
                      loading={picker.loading}
                    />
                  </View>

                  {row.player_id != null ? (
                    <View
                      testID={`profile-image-existing-${row.index}`}
                      className="flex-row items-center gap-1 flex-wrap"
                    >
                      {existingImages.length === 0 ? (
                        <Text className="text-xs text-gray-500">No existing images</Text>
                      ) : (
                        existingImages.map(img => (
                          <View key={img.id} className="relative">
                            <Image
                              source={{ uri: img.url }}
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                borderWidth: img.is_pdf_primary ? 2 : 0,
                                borderColor: '#2563eb',
                              }}
                            />
                            {img.is_pdf_primary ? (
                              <Text className="text-[10px] text-blue-600 text-center">
                                PDF
                              </Text>
                            ) : null}
                          </View>
                        ))
                      )}
                    </View>
                  ) : null}

                  <Text
                    testID={`profile-image-status-${row.index}`}
                    className="text-xs text-gray-500"
                  >
                    {displayStatus}
                  </Text>
                </View>

                {atCapacity(row) ? (
                  <Text
                    testID={`profile-image-capacity-${row.index}`}
                    className="text-amber-700 text-sm mt-2"
                  >
                    This player already has the maximum of {maxImagesPerPlayer} profile
                    images.
                  </Text>
                ) : null}

                {row.errors.map(message => (
                  <Text
                    key={message}
                    testID={`profile-image-error-${row.index}`}
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
    </ScrollView>
  );
}
