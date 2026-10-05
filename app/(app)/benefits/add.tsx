import BenefitEditorForm from '@/components/benefits/BenefitEditorForm';
import AppLayout from '@/components/layout/AppLayout';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import { useToast } from '@/context/ToastContext';
import { BenefitsApiService } from '@/services/api/benefitsApi';
import { buildResourceBreadcrumbs } from '@/utils/buildResourceBreadcrumbs';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

const api = new BenefitsApiService();

export default function AddBenefitPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  useBreadcrumbSegments(
    'benefits-add',
    buildResourceBreadcrumbs({
      sectionLabel: 'Benefits',
      sectionHref: '/benefits',
      leaf: 'Add',
    })
  );

  const onSubmit = useCallback(
    async (payload: any) => {
      setSubmitting(true);
      setErrors({});
      try {
        const response = await api.createBenefit(payload);
        showSuccess('Benefit created');
        router.replace(`/benefits/${response.data.id_benefit}` as any);
      } catch (err: any) {
        if (err?.errors) setErrors(err.errors);
        showError('Create failed', err?.message || 'Could not create benefit');
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [router, showError, showSuccess]
  );

  return (
    <AppLayout
      title="Add benefit"
      description="Define effect, scope, conditions, and stacking"
    >
      <ScrollView className="flex-1">
        <View className="p-4">
          <BenefitEditorForm
            submitting={submitting}
            errors={errors}
            submitLabel="Create"
            onCancel={() => router.back()}
            onSubmit={onSubmit}
          />
        </View>
      </ScrollView>
    </AppLayout>
  );
}
