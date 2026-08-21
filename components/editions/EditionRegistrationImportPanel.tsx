/**
 * Edition registration CSV import (mapped players only; no remap).
 */

import { useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import CsvFilePicker from '@/components/players/CsvFilePicker';
import { useToast } from '@/context/ToastContext';
import { queryKeys } from '@/lib/queryClient';
import { ApiError } from '@/services/api/baseApi';
import {
  EditionRegistrationImportApiService,
  EditionRegistrationImportSaveRow,
} from '@/services/api/editionRegistrationImportApi';
import { ApiEditionRegistrationImportPreviewRow } from '@/types/api/entities';
import { isListImageUrl } from '@/utils/imageMetadata';
import { confirmDiscardDirty } from '@/utils/softDirtyNav';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import { Image, ScrollView, Switch, Text, View } from 'react-native';

const api = new EditionRegistrationImportApiService();
const PREVIEW_IMAGE_SIZE = 40;

type DraftRow = ApiEditionRegistrationImportPreviewRow & {
  included: boolean;
  player_id: number | null;
  errors: string[];
};

function isEligible(row: {
  mapping: { status: string };
  already_registered: boolean;
  player_id?: number | null;
}): boolean {
  return (
    row.mapping.status === 'mapped' &&
    !row.already_registered &&
    row.player_id != null
  );
}

function playerLabel(row: DraftRow): string {
  const player = row.mapping.player;
  if (player?.name) return player.name;
  if (row.player_id != null) return `Player #${row.player_id}`;
  return '—';
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

type Props = {
  editionId: number;
  finalized?: boolean;
};

export default function EditionRegistrationImportPanel({
  editionId,
  finalized = false,
}: Props) {
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<string | null>(null);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const applyPreview = useCallback(
    (previewRows: ApiEditionRegistrationImportPreviewRow[]) => {
      const nextRows = previewRows.map(row => {
        const player_id = row.mapping.player?.id_player ?? null;
        const eligible = isEligible({
          mapping: row.mapping,
          already_registered: row.already_registered,
          player_id,
        });
        return {
          ...row,
          included: eligible,
          player_id,
          errors: [],
        };
      });
      setRows(nextRows);
      // Edition chrome requires isDirty for Save; pending eligible includes are actionable.
      setDirty(
        nextRows.some(
          row =>
            row.included &&
            isEligible({
              mapping: row.mapping,
              already_registered: row.already_registered,
              player_id: row.player_id,
            })
        )
      );
    },
    []
  );

  const runPreview = useCallback(
    async (nextFile: File) => {
      if (finalized) return;
      setLoading(true);
      try {
        const response = await api.preview(editionId, nextFile);
        setFormat(response.data.format);
        applyPreview(response.data.rows);
      } catch (err: any) {
        showError('Preview failed', err?.message || 'Could not preview CSV');
      } finally {
        setLoading(false);
      }
    },
    [applyPreview, editionId, finalized, showError]
  );

  const onFile = useCallback(
    async (next: File) => {
      if (finalized) return;
      setFile(next);
      await runPreview(next);
    },
    [finalized, runPreview]
  );

  const updateRow = (index: number, patch: Partial<DraftRow>) => {
    setRows(prev =>
      prev.map(row =>
        row.index === index ? { ...row, ...patch, errors: [] } : row
      )
    );
    setDirty(true);
  };

  const save = useCallback(async () => {
    if (finalized || !format || !file) return;

    const payloadRows: EditionRegistrationImportSaveRow[] = rows
      .filter(
        row =>
          row.included &&
          isEligible({
            mapping: row.mapping,
            already_registered: row.already_registered,
            player_id: row.player_id,
          })
      )
      .map(row => ({
        index: row.index,
        first_name: row.first_name || null,
        middle_name: row.middle_name,
        last_name: row.last_name,
        email: row.email || null,
        phone: row.phone || null,
        player_id: row.player_id,
        status: row.mapping.status,
      }));

    if (payloadRows.length === 0) return;

    setSaving(true);
    try {
      const response = await api.save(editionId, {
        format,
        rows: payloadRows,
      });
      setDirty(false);
      showSuccess(
        'Import saved',
        response.message ||
          `Registered ${response.data.registered} player(s)`
      );
      await queryClient.invalidateQueries({
        queryKey: ['resourceList', 'EditionRegistration'],
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.edition(editionId),
      });
      if (file) {
        await runPreview(file);
      }
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
  }, [
    editionId,
    file,
    finalized,
    format,
    queryClient,
    rows,
    runPreview,
    showError,
    showSuccess,
  ]);

  const refresh = useCallback(async () => {
    if (finalized || !file) return;
    if (dirty) {
      const ok = await confirmDiscardDirty();
      if (!ok) return;
    }
    await runPreview(file);
  }, [dirty, file, finalized, runPreview]);

  const eligibleIncluded = rows.filter(
    row =>
      row.included &&
      isEligible({
        mapping: row.mapping,
        already_registered: row.already_registered,
        player_id: row.player_id,
      })
  );
  const canSave =
    !finalized &&
    eligibleIncluded.length > 0 &&
    !!format &&
    !!file &&
    !saving;

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
    <ScrollView
      className="flex-1"
      testID="edition-registration-import-panel"
    >
      {finalized ? (
        <Text
          testID="registrations-finalized-hint"
          className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3"
        >
          Edition is finalized — registrations cannot be added or deleted.
        </Text>
      ) : null}

      <View className="flex-row items-center justify-between mb-4">
        <CsvFilePicker
          onFile={onFile}
          disabled={finalized || loading || saving}
          filename={file?.name}
        />
        {loading ? (
          <Text className="text-sm text-gray-500">Loading preview…</Text>
        ) : null}
      </View>

      {rows.length === 0 ? (
        <Text className="text-gray-500">
          Choose a Playtomic CSV to preview registration rows.
        </Text>
      ) : (
        <View>
          {rows.map(row => {
            const eligible = isEligible({
              mapping: row.mapping,
              already_registered: row.already_registered,
              player_id: row.player_id,
            });
            return (
              <View
                key={row.index}
                testID={`import-row-${row.index}`}
                className="border border-gray-200 rounded-lg p-3 mb-3 bg-white"
              >
                <View className="flex-row items-center mb-2 flex-wrap">
                  <Text className="text-sm text-gray-600 mr-2">Include</Text>
                  <Switch
                    testID={`import-include-${row.index}`}
                    value={row.included}
                    disabled={!eligible || finalized}
                    onValueChange={value =>
                      updateRow(row.index, { included: value })
                    }
                  />
                  <Text
                    testID={`import-status-${row.index}`}
                    className="ml-3 text-xs text-gray-500"
                  >
                    {row.mapping.status}
                  </Text>
                  {row.already_registered ? (
                    <Text
                      testID={`import-already-registered-${row.index}`}
                      className="ml-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5"
                    >
                      Already registered
                    </Text>
                  ) : null}
                </View>
                <View className="flex-row flex-wrap gap-x-4 gap-y-1">
                  <Text
                    testID={`import-name-${row.index}`}
                    className="text-sm text-gray-800"
                  >
                    {[row.first_name, row.middle_name, row.last_name]
                      .filter(part => part != null && part !== '')
                      .join(' ') || '—'}
                  </Text>
                  <Text
                    testID={`import-email-${row.index}`}
                    className="text-sm text-gray-600"
                  >
                    {row.email || '—'}
                  </Text>
                  <Text
                    testID={`import-phone-${row.index}`}
                    className="text-sm text-gray-600"
                  >
                    {row.phone || '—'}
                  </Text>
                  <View
                    testID={`import-player-${row.index}`}
                    className="flex-row items-center"
                  >
                    {isListImageUrl(row.mapping.player?.profile_image_url) ? (
                      <Image
                        testID={`import-player-image-${row.index}`}
                        source={{ uri: row.mapping.player!.profile_image_url! }}
                        style={{
                          width: PREVIEW_IMAGE_SIZE,
                          height: PREVIEW_IMAGE_SIZE,
                        }}
                        className="rounded-md bg-gray-100 mr-2"
                        accessibilityLabel={playerLabel(row)}
                      />
                    ) : null}
                    <Text
                      testID={`import-player-label-${row.index}`}
                      className="text-sm text-gray-700"
                    >
                      {playerLabel(row)}
                    </Text>
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
    </ScrollView>
  );
}
