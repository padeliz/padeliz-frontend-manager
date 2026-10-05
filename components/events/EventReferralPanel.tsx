/**
 * Event referral settings + simple touchpoints/attributions lists.
 */

import ActionButton from '@/components/ui/ActionButton';
import AppTextInput from '@/components/ui/AppTextInput';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/context/ToastContext';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { ReferralApiService } from '@/services/api/referralApi';
import {
  ApiReferralAttribution,
  ApiReferralTouchpoint,
} from '@/types/api/entities';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

const api = new ReferralApiService();

function formatTs(ts?: number | null): string {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleString();
}

function playerLabel(
  player: { name?: string; id_player?: number } | null | undefined,
  fallbackId: number
): string {
  return player?.name || `Player #${fallbackId}`;
}

type Props = {
  eventId: number;
};

export default function EventReferralPanel({ eventId }: Props) {
  const { showSuccess, showError } = useToast();
  const saveStatus = useActionButtonStatus({ auditoryFeedback: true });
  const [loading, setLoading] = useState(true);
  const [ttlHours, setTtlHours] = useState('72');
  const [touchpoints, setTouchpoints] = useState<ApiReferralTouchpoint[]>([]);
  const [attributions, setAttributions] = useState<ApiReferralAttribution[]>(
    []
  );
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const showErrorRef = useRef(showError);
  showErrorRef.current = showError;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, touchRes, attrRes] = await Promise.all([
        api.getEventReferralSettings(eventId),
        api.getReferralTouchpoints({
          event_id: eventId,
          page: 1,
          per_page: 25,
        }),
        api.getReferralAttributions({
          event_id: eventId,
          page: 1,
          per_page: 25,
        }),
      ]);
      setTtlHours(String(settingsRes.data.code_ttl_hours ?? 72));
      setTouchpoints(touchRes.data || []);
      setAttributions(attrRes.data || []);
    } catch (err: any) {
      showErrorRef.current(
        'Load failed',
        err?.message || 'Could not load referral data'
      );
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    setErrors({});
    const hours = Math.trunc(Number(ttlHours));
    if (!Number.isFinite(hours) || hours < 1) {
      setErrors({ code_ttl_hours: ['Enter a TTL of at least 1 hour.'] });
      throw new Error('Invalid TTL');
    }
    try {
      const response = await api.updateEventReferralSettings(eventId, {
        code_ttl_hours: hours,
      });
      setTtlHours(String(response.data.code_ttl_hours));
      showSuccess('Referral settings saved');
    } catch (err: any) {
      if (err?.errors) setErrors(err.errors);
      showError('Save failed', err?.message || 'Could not save settings');
      throw err;
    }
  }, [eventId, showError, showSuccess, ttlHours]);

  if (loading) {
    return (
      <View className="p-4 items-center">
        <LoadingSpinner text="Loading referral data..." />
      </View>
    );
  }

  return (
    <View testID="event-referral-panel" className="p-4 gap-4">
      <View className="bg-white border border-gray-200 rounded-lg p-4 gap-3">
        <Text className="text-base font-semibold text-gray-800">
          Referral settings
        </Text>
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">
            Code TTL (hours)
          </Text>
          <AppTextInput
            testID="referral-ttl-hours"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            keyboardType="numeric"
            value={ttlHours}
            onChangeText={setTtlHours}
          />
          {errors.code_ttl_hours?.map(message => (
            <Text
              key={message}
              testID="referral-ttl-error"
              className="text-red-600 text-sm mt-1"
            >
              {message}
            </Text>
          ))}
        </View>
        <ActionButton
          testID="referral-settings-save"
          label="Save settings"
          variant="primary"
          status={saveStatus.status}
          errorMessage={saveStatus.errorMessage ?? undefined}
          onPress={() => {
            void saveStatus.run(save);
          }}
        />
      </View>

      <View className="bg-white border border-gray-200 rounded-lg p-4">
        <Text className="text-base font-semibold text-gray-800 mb-3">
          Touchpoints
        </Text>
        {touchpoints.length === 0 ? (
          <Text testID="referral-no-touchpoints" className="text-sm text-gray-500">
            No touchpoints for this event.
          </Text>
        ) : (
          <View testID="referral-touchpoints-list" className="gap-2">
            {touchpoints.map(row => (
              <View
                key={row.id_touchpoint}
                testID={`referral-touchpoint-${row.id_touchpoint}`}
                className="border border-gray-200 rounded-lg p-3"
              >
                <Text className="text-sm text-gray-800">
                  #{row.id_touchpoint} ·{' '}
                  {playerLabel(row.referrer_player, row.referrer_player_id)} →{' '}
                  {playerLabel(row.referred_player, row.referred_player_id)}
                </Text>
                <Text className="text-xs text-gray-500 mt-1">
                  {formatTs(row.touched_at)} · eligible:{' '}
                  {row.discount_eligible ? 'yes' : 'no'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className="bg-white border border-gray-200 rounded-lg p-4">
        <Text className="text-base font-semibold text-gray-800 mb-3">
          Attributions
        </Text>
        {attributions.length === 0 ? (
          <Text
            testID="referral-no-attributions"
            className="text-sm text-gray-500"
          >
            No attributions for this event.
          </Text>
        ) : (
          <View testID="referral-attributions-list" className="gap-2">
            {attributions.map(row => (
              <View
                key={row.id_attribution}
                testID={`referral-attribution-${row.id_attribution}`}
                className="border border-gray-200 rounded-lg p-3"
              >
                <Text className="text-sm text-gray-800">
                  #{row.id_attribution} ·{' '}
                  {playerLabel(row.referrer_player, row.referrer_player_id)} →{' '}
                  {playerLabel(row.referred_player, row.referred_player_id)}
                </Text>
                <Text className="text-xs text-gray-500 mt-1">
                  {String(row.status).replace(/_/g, ' ')} ·{' '}
                  {formatTs(row.inserted_at)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
