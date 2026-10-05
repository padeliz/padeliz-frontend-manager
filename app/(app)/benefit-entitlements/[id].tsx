import AppLayout from '@/components/layout/AppLayout';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import ActionButton from '@/components/ui/ActionButton';
import DateTimeFormInput from '@/components/ui/DateTimeFormInput';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/context/ToastContext';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { BenefitEntitlementsApiService } from '@/services/api/benefitEntitlementsApi';
import { ApiBenefitEntitlement } from '@/types/api/entities';
import { buildResourceBreadcrumbs } from '@/utils/buildResourceBreadcrumbs';
import { confirmAction } from '@/utils/confirmAction';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

const api = new BenefitEntitlementsApiService();

function formatTs(ts?: number | null): string {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleString();
}

export default function ViewBenefitEntitlementPage() {
  const params = useLocalSearchParams<{ id: string }>();
  const entitlementId = Number(params.id);
  const { showSuccess, showError } = useToast();
  const revokeStatus = useActionButtonStatus({ auditoryFeedback: true });
  const extendStatus = useActionButtonStatus({ auditoryFeedback: true });
  const [entitlement, setEntitlement] = useState<ApiBenefitEntitlement | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [extendUntil, setExtendUntil] = useState<Date | null>(null);
  const showErrorRef = useRef(showError);
  showErrorRef.current = showError;

  useBreadcrumbSegments(
    'benefit-entitlements-view',
    buildResourceBreadcrumbs({
      sectionLabel: 'Entitlements',
      sectionHref: '/benefit-entitlements',
      leaf: `#${entitlementId}`,
    })
  );

  const load = useCallback(async () => {
    if (!Number.isFinite(entitlementId)) return;
    setLoading(true);
    try {
      const response = await api.getEntitlement(entitlementId);
      setEntitlement(response.data);
      setExtendUntil(
        response.data.valid_until
          ? new Date(response.data.valid_until * 1000)
          : null
      );
    } catch (err: any) {
      showErrorRef.current(
        'Load failed',
        err?.message || 'Could not load entitlement'
      );
    } finally {
      setLoading(false);
    }
  }, [entitlementId]);

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = useCallback(async () => {
    const response = await api.revokeEntitlement(entitlementId);
    setEntitlement(response.data);
    showSuccess('Entitlement revoked');
  }, [entitlementId, showSuccess]);

  const onRevokePress = useCallback(() => {
    confirmAction(
      'Revoke entitlement?',
      'The player will lose this grant immediately.',
      () => {
        void revokeStatus.run(async () => {
          try {
            await revoke();
          } catch (err: any) {
            showError('Revoke failed', err?.message || 'Could not revoke');
            throw err;
          }
        });
      }
    );
  }, [revoke, revokeStatus, showError]);

  const extend = useCallback(async () => {
    if (!extendUntil) {
      showError('Extend failed', 'Pick a new valid until date');
      throw new Error('Missing valid_until');
    }
    try {
      const response = await api.extendEntitlement(
        entitlementId,
        Math.floor(extendUntil.getTime() / 1000)
      );
      setEntitlement(response.data);
      showSuccess('Entitlement extended');
    } catch (err: any) {
      showError('Extend failed', err?.message || 'Could not extend');
      throw err;
    }
  }, [entitlementId, extendUntil, showError, showSuccess]);

  const isRevoked = entitlement?.status === 'revoked';

  return (
    <AppLayout
      title={
        entitlement?.benefit_definition?.name ||
        `Entitlement #${entitlementId}`
      }
      description="Review, extend, or revoke a grant"
      headerActions={
        entitlement && !isRevoked ? (
          <ActionButton
            testID="entitlement-revoke"
            label="Revoke"
            variant="danger"
            status={revokeStatus.status}
            errorMessage={revokeStatus.errorMessage ?? undefined}
            onPress={onRevokePress}
          />
        ) : null
      }
    >
      {loading ? (
        <View className="flex-1 justify-center items-center p-6">
          <LoadingSpinner text="Loading entitlement..." />
        </View>
      ) : !entitlement ? (
        <View className="p-4">
          <Text className="text-gray-600">Entitlement not found.</Text>
        </View>
      ) : (
        <View className="p-4 gap-4">
          <View
            testID="entitlement-detail"
            className="bg-white border border-gray-200 rounded-lg p-4 gap-2"
          >
            <Text className="text-sm text-gray-700">
              Status: {String(entitlement.status).replace(/_/g, ' ')}
            </Text>
            <Text className="text-sm text-gray-700">
              Player:{' '}
              {entitlement.player?.name || `Player #${entitlement.player_id}`}
            </Text>
            <Text className="text-sm text-gray-700">
              Benefit:{' '}
              {entitlement.benefit_definition?.name ||
                `Benefit #${entitlement.benefit_definition_id}`}
            </Text>
            <Text className="text-sm text-gray-700">
              Remaining uses: {entitlement.remaining_uses ?? '—'}
            </Text>
            <Text className="text-sm text-gray-700">
              Valid from: {formatTs(entitlement.valid_from)}
            </Text>
            <Text className="text-sm text-gray-700">
              Valid until: {formatTs(entitlement.valid_until)}
            </Text>
            <Text className="text-sm text-gray-700">
              Source: {String(entitlement.source_type).replace(/_/g, ' ')}
            </Text>
          </View>

          {!isRevoked ? (
            <View
              testID="entitlement-extend-panel"
              className="bg-white border border-gray-200 rounded-lg p-4 gap-3"
            >
              <Text className="text-base font-semibold text-gray-800">
                Extend
              </Text>
              <DateTimeFormInput
                inputType="datetime"
                value={extendUntil}
                onChange={setExtendUntil}
              />
              <ActionButton
                testID="entitlement-extend"
                label="Extend valid until"
                variant="primary"
                status={extendStatus.status}
                errorMessage={extendStatus.errorMessage ?? undefined}
                onPress={() => {
                  void extendStatus.run(extend);
                }}
              />
            </View>
          ) : null}
        </View>
      )}
    </AppLayout>
  );
}
