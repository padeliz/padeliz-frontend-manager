import { useToast } from '@/context/ToastContext';
import {
  EditionParticipationMappingApiService,
  EditionParticipationMapPreview,
} from '@/services/api/editionParticipationMappingApi';
import { confirmAction } from '@/components/editions/editionLotteryUtils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

const mappingApi = new EditionParticipationMappingApiService();

const DISABLED_HINTS: Record<string, string> = {
  finalized: 'Edition is finalized — participations cannot be remapped.',
  schedule_exists: 'Cannot map after a schedule has been generated.',
  lottery_exists: 'Cannot map after lottery draws exist for this edition.',
  no_divisions: 'Add edition divisions before mapping participations.',
};

type Props = {
  editionId: number;
  mutationsDisabled: boolean;
};

export default function EditionParticipationMappingButton({
  editionId,
  mutationsDisabled,
}: Props) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const previewQuery = useQuery({
    queryKey: ['editionParticipationMapPreview', editionId],
    queryFn: async () => {
      const res = await mappingApi.preview(editionId);
      return res.data as EditionParticipationMapPreview;
    },
    enabled: Number.isFinite(editionId),
  });

  const preview = previewQuery.data;
  const disabled =
    mutationsDisabled ||
    previewQuery.isLoading ||
    previewQuery.isFetching ||
    preview?.can_map === false;

  const hint = mutationsDisabled
    ? 'Edition is finalized — participations cannot be remapped.'
    : preview?.disabled_reason
      ? DISABLED_HINTS[preview.disabled_reason] ?? 'Mapping is unavailable.'
      : null;

  const runMap = useCallback(
    async (confirmOverwrite: boolean) => {
      try {
        const res = await mappingApi.map(editionId, {
          confirm_overwrite: confirmOverwrite,
        });
        toast.showSuccess(
          'Participations mapped',
          `Mapped ${res.data?.created_count ?? 0} participations.`
        );
        await queryClient.invalidateQueries({
          queryKey: ['editionParticipations', editionId],
        });
        await queryClient.invalidateQueries({
          queryKey: ['editionParticipationMapPreview', editionId],
        });
      } catch (e: any) {
        toast.showError('Mapping failed', e?.message || 'Unknown error');
      }
    },
    [editionId, queryClient, toast]
  );

  const onPress = useCallback(() => {
    if (disabled || !preview) return;

    const existing = preview.existing_participations_count ?? 0;
    if (existing > 0) {
      const regCount = preview.registered_player_count ?? 0;
      const message =
        regCount === 0
          ? 'This will remove all current participations. There are no registrations to map. Continue?'
          : 'This will overwrite all current participations for this edition. Continue?';
      confirmAction('Map players to divisions', message, () => {
        void runMap(true);
      });
      return;
    }

    void runMap(false);
  }, [disabled, preview, runMap]);

  return (
    <View className="mb-3 gap-2">
      <Pressable
        testID="map-participations-button"
        disabled={disabled}
        onPress={onPress}
        className={`self-start px-3 py-2 rounded-lg ${
          disabled ? 'bg-gray-300' : 'bg-blue-600'
        }`}
      >
        {previewQuery.isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white text-sm font-medium">
            Map players to divisions
          </Text>
        )}
      </Pressable>
      {hint && (
        <Text
          testID="map-participations-hint"
          className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2"
        >
          {hint}
        </Text>
      )}
    </View>
  );
}
