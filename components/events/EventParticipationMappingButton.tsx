import ActionButton from '@/components/ui/ActionButton';
import { confirmAction } from '@/components/events/eventLotteryUtils';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import {
  EventParticipationMappingApiService,
  EventParticipationMapPreview,
} from '@/services/api/eventParticipationMappingApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback } from 'react';
import { Text, View } from 'react-native';

const mappingApi = new EventParticipationMappingApiService();

// Preview and map both count active registrations only — cancelled and declined
// players are filtered out server-side, so no client-side filtering is needed.

const DISABLED_HINTS: Record<string, string> = {
  finalized: 'Event is finalized — participations cannot be remapped.',
  schedule_exists: 'Cannot map after a schedule has been generated.',
  lottery_exists: 'Cannot map after lottery draws exist for this event.',
  no_divisions: 'Add event divisions before mapping participations.',
};

type Props = {
  eventId: number;
  mutationsDisabled: boolean;
};

export default function EventParticipationMappingButton({
  eventId,
  mutationsDisabled,
}: Props) {
  const queryClient = useQueryClient();
  const mapStatus = useActionButtonStatus({ auditoryFeedback: true });
  const previewQuery = useQuery({
    queryKey: ['eventParticipationMapPreview', eventId],
    queryFn: async () => {
      const res = await mappingApi.preview(eventId);
      return res.data as EventParticipationMapPreview;
    },
    enabled: Number.isFinite(eventId),
  });

  const preview = previewQuery.data;
  // Block presses while any preview fetch is in flight; "checking" UI is initial load only.
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
    preview == null && previewQuery.isLoading ? 'checking' : mapStatus.status;

  const runMap = useCallback(
    async (confirmOverwrite: boolean) => {
      await mappingApi.map(eventId, {
        confirm_overwrite: confirmOverwrite,
      });
      await queryClient.invalidateQueries({
        queryKey: ['eventParticipations', eventId],
      });
      await queryClient.invalidateQueries({
        queryKey: ['eventParticipationMapPreview', eventId],
      });
    },
    [eventId, queryClient]
  );

  const onPress = useCallback(() => {
    if (structurallyDisabled || previewBusy || !preview) return;

    const existing = preview.existing_participations_count ?? 0;
    if (existing > 0) {
      const regCount = preview.registered_player_count ?? 0;
      const message =
        regCount === 0
          ? 'This will remove all current participations. There are no registrations to map. Continue?'
          : 'This will overwrite all current participations for this event. Continue?';
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
      <Text
        testID="map-participations-active-only-note"
        className="text-xs text-gray-500 mt-1"
      >
        Only active registrations are mapped.
      </Text>
    </View>
  );
}
