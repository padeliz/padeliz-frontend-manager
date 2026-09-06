import ActionButton from '@/components/ui/ActionButton';
import { confirmAction } from '@/components/editions/editionLotteryUtils';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import {
  EditionParticipationMappingApiService,
  EditionParticipationMapPreview,
} from '@/services/api/editionParticipationMappingApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback } from 'react';
import { View } from 'react-native';

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
  const queryClient = useQueryClient();
  const mapStatus = useActionButtonStatus({ auditoryFeedback: true });
  const previewQuery = useQuery({
    queryKey: ['editionParticipationMapPreview', editionId],
    queryFn: async () => {
      const res = await mappingApi.preview(editionId);
      return res.data as EditionParticipationMapPreview;
    },
    enabled: Number.isFinite(editionId),
  });

  const preview = previewQuery.data;
  const previewBusy = previewQuery.isLoading || previewQuery.isFetching;
  const structurallyDisabled =
    mutationsDisabled || preview?.can_map === false;

  const disabledReason = mutationsDisabled
    ? DISABLED_HINTS.finalized
    : preview?.disabled_reason
      ? (DISABLED_HINTS[preview.disabled_reason] ?? 'Mapping is unavailable.')
      : undefined;

  // Initial probe only — do not let background preview refetch override map success/error.
  const status =
    preview == null && previewBusy ? 'checking' : mapStatus.status;

  const runMap = useCallback(
    async (confirmOverwrite: boolean) => {
      await mappingApi.map(editionId, {
        confirm_overwrite: confirmOverwrite,
      });
      await queryClient.invalidateQueries({
        queryKey: ['editionParticipations', editionId],
      });
      await queryClient.invalidateQueries({
        queryKey: ['editionParticipationMapPreview', editionId],
      });
    },
    [editionId, queryClient]
  );

  const onPress = useCallback(() => {
    if (structurallyDisabled || previewBusy || !preview) return;

    const existing = preview.existing_participations_count ?? 0;
    if (existing > 0) {
      const regCount = preview.registered_player_count ?? 0;
      const message =
        regCount === 0
          ? 'This will remove all current participations. There are no registrations to map. Continue?'
          : 'This will overwrite all current participations for this edition. Continue?';
      confirmAction('Map players to divisions', message, () => {
        void mapStatus.run(() => runMap(true));
      });
      return;
    }

    void mapStatus.run(() => runMap(false));
  }, [
    structurallyDisabled,
    previewBusy,
    preview,
    mapStatus,
    runMap,
  ]);

  return (
    <View className="mb-3 self-start">
      <ActionButton
        testID="map-participations-button"
        label="Map players to divisions"
        variant="primary"
        size="sm"
        status={status}
        errorMessage={
          status === 'error' ? (mapStatus.errorMessage ?? undefined) : undefined
        }
        disabled={structurallyDisabled && !previewBusy}
        disabledReason={
          structurallyDisabled && !previewBusy ? disabledReason : undefined
        }
        onPress={onPress}
      />
    </View>
  );
}
