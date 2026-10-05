import BenefitEditorForm from '@/components/benefits/BenefitEditorForm';
import AppLayout from '@/components/layout/AppLayout';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/context/ToastContext';
import { BenefitsApiService } from '@/services/api/benefitsApi';
import { ApiBenefitDefinition } from '@/types/api/entities';
import { buildResourceBreadcrumbs } from '@/utils/buildResourceBreadcrumbs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

const api = new BenefitsApiService();

export default function EditBenefitPage() {
  const params = useLocalSearchParams<{ id: string }>();
  const benefitId = Number(params.id);
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [benefit, setBenefit] = useState<ApiBenefitDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const showErrorRef = useRef(showError);
  showErrorRef.current = showError;

  useBreadcrumbSegments(
    'benefits-edit',
    buildResourceBreadcrumbs({
      sectionLabel: 'Benefits',
      sectionHref: '/benefits',
      leaf: benefit?.name || `Benefit #${benefitId}`,
    })
  );

  const load = useCallback(async () => {
    if (!Number.isFinite(benefitId)) return;
    setLoading(true);
    try {
      const response = await api.getBenefit(benefitId);
      setBenefit(response.data);
    } catch (err: any) {
      showErrorRef.current(
        'Load failed',
        err?.message || 'Could not load benefit'
      );
    } finally {
      setLoading(false);
    }
  }, [benefitId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = useCallback(
    async (payload: any) => {
      setSubmitting(true);
      setErrors({});
      try {
        const response = await api.updateBenefit(benefitId, payload);
        setBenefit(response.data);
        showSuccess('Benefit saved');
      } catch (err: any) {
        if (err?.errors) setErrors(err.errors);
        showError('Save failed', err?.message || 'Could not save benefit');
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [benefitId, showError, showSuccess]
  );

  return (
    <AppLayout
      title={benefit?.name || 'Benefit'}
      description="Edit effect, scope, conditions, and stacking"
    >
      {loading ? (
        <View className="flex-1 justify-center items-center p-6">
          <LoadingSpinner text="Loading benefit..." />
        </View>
      ) : !benefit ? (
        <View className="p-4">
          <Text className="text-gray-600">Benefit not found.</Text>
        </View>
      ) : (
        <ScrollView className="flex-1">
          <View className="p-4">
            <BenefitEditorForm
              initial={benefit}
              submitting={submitting}
              errors={errors}
              submitLabel="Save"
              onCancel={() => router.push('/benefits' as any)}
              onSubmit={onSubmit}
            />
          </View>
        </ScrollView>
      )}
    </AppLayout>
  );
}
