import AppLayout from '@/components/layout/AppLayout';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import ActionButton from '@/components/ui/ActionButton';
import DateTimeFormInput from '@/components/ui/DateTimeFormInput';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import { useToast } from '@/context/ToastContext';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { usePlayerPicker } from '@/hooks/usePlayerPicker';
import { BenefitEntitlementsApiService } from '@/services/api/benefitEntitlementsApi';
import { BenefitsApiService } from '@/services/api/benefitsApi';
import { DropdownOption } from '@/types/ui/dropdowns';
import { buildResourceBreadcrumbs } from '@/utils/buildResourceBreadcrumbs';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

const entitlementsApi = new BenefitEntitlementsApiService();
const benefitsApi = new BenefitsApiService();

export default function GrantBenefitEntitlementPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const grantStatus = useActionButtonStatus({ auditoryFeedback: true });
  const [benefitId, setBenefitId] = useState<number | null>(null);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [validUntil, setValidUntil] = useState<Date | null>(null);
  const [benefitOptions, setBenefitOptions] = useState<DropdownOption[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const playerPicker = usePlayerPicker({ selectedValue: playerId });

  useBreadcrumbSegments(
    'benefit-entitlements-add',
    buildResourceBreadcrumbs({
      sectionLabel: 'Entitlements',
      sectionHref: '/benefit-entitlements',
      leaf: 'Grant',
    })
  );

  useEffect(() => {
    void benefitsApi
      .getBenefits({
        page: 1,
        per_page: 100,
        filters: { is_active: 1 },
        sort_by: { name: 'asc' },
      })
      .then(res => {
        setBenefitOptions(
          (res.data || []).map(b => ({
            label: `${b.name} (${b.slug})`,
            value: b.id_benefit,
          }))
        );
      })
      .catch(() => setBenefitOptions([]));
  }, []);

  const grant = useCallback(async () => {
    setErrors({});
    if (benefitId == null || playerId == null) {
      setErrors({
        ...(benefitId == null
          ? { benefit_definition_id: ['Select a benefit.'] }
          : {}),
        ...(playerId == null ? { player_id: ['Select a player.'] } : {}),
      });
      throw new Error('Missing required fields');
    }
    try {
      const response = await entitlementsApi.grantEntitlement({
        benefit_definition_id: benefitId,
        player_id: playerId,
        valid_until: validUntil
          ? Math.floor(validUntil.getTime() / 1000)
          : null,
      });
      showSuccess('Entitlement granted');
      router.replace(
        `/benefit-entitlements/${response.data.id_entitlement}` as any
      );
    } catch (err: any) {
      if (err?.errors) setErrors(err.errors);
      showError('Grant failed', err?.message || 'Could not grant entitlement');
      throw err;
    }
  }, [benefitId, playerId, router, showError, showSuccess, validUntil]);

  return (
    <AppLayout
      title="Grant entitlement"
      description="Assign an active benefit to a player"
      headerActions={
        <ActionButton
          testID="entitlement-grant-submit"
          label="Grant"
          variant="primary"
          status={grantStatus.status}
          errorMessage={grantStatus.errorMessage ?? undefined}
          onPress={() => {
            void grantStatus.run(grant);
          }}
        />
      }
    >
      <View className="p-4">
        <View
          testID="entitlement-grant-form"
          className="bg-white border border-gray-200 rounded-lg p-4 gap-4"
        >
          <View>
            <SingleSelectDropdown
              title="Benefit *"
              options={benefitOptions}
              selectedValue={benefitId}
              onSelectionChange={v =>
                setBenefitId(v == null || v === '' ? null : Number(v))
              }
              placeholder="Select active benefit"
            />
            {errors.benefit_definition_id?.map(message => (
              <Text
                key={message}
                className="text-red-600 text-sm mt-1"
                testID="entitlement-error-benefit"
              >
                {message}
              </Text>
            ))}
          </View>

          <View>
            <SingleSelectDropdown
              title="Player *"
              options={playerPicker.options}
              selectedValue={playerId}
              onSelectionChange={v =>
                setPlayerId(v == null || v === '' ? null : Number(v))
              }
              placeholder="Search player (min 2 chars)"
              searchable
              onSearch={playerPicker.onSearch}
              loading={playerPicker.loading}
            />
            {errors.player_id?.map(message => (
              <Text
                key={message}
                className="text-red-600 text-sm mt-1"
                testID="entitlement-error-player"
              >
                {message}
              </Text>
            ))}
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Valid until
            </Text>
            <DateTimeFormInput
              inputType="datetime"
              value={validUntil}
              onChange={setValidUntil}
              placeholder="Optional expiry"
            />
            {errors.valid_until?.map(message => (
              <Text
                key={message}
                className="text-red-600 text-sm mt-1"
                testID="entitlement-error-valid-until"
              >
                {message}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </AppLayout>
  );
}
