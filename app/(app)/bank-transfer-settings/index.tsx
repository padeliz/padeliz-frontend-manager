/**
 * Bank transfer settings — the IBAN details players see when paying by transfer.
 */

import AppLayout from '@/components/layout/AppLayout';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import ActionButton from '@/components/ui/ActionButton';
import AppTextInput from '@/components/ui/AppTextInput';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/context/ToastContext';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import {
  BankTransferSettingsApiService,
  BankTransferSettingsPayload,
} from '@/services/api/bankTransferSettingsApi';
import { buildResourceBreadcrumbs } from '@/utils/buildResourceBreadcrumbs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

const api = new BankTransferSettingsApiService();

const EMPTY_FORM: BankTransferSettingsPayload = {
  iban: '',
  beneficiary_name: '',
  bank_name: '',
  payment_reference_template: '',
  extra_instructions: '',
};

type FieldKey = keyof BankTransferSettingsPayload;

const FIELDS: {
  key: FieldKey;
  label: string;
  placeholder: string;
  multiline?: boolean;
}[] = [
  { key: 'iban', label: 'IBAN *', placeholder: 'RO49AAAA1B31007593840000' },
  {
    key: 'beneficiary_name',
    label: 'Beneficiary name *',
    placeholder: 'Padeliz SRL',
  },
  { key: 'bank_name', label: 'Bank name', placeholder: 'Banca Transilvania' },
  {
    key: 'payment_reference_template',
    label: 'Payment reference template',
    placeholder: 'PAD-{checkout_id}',
  },
  {
    key: 'extra_instructions',
    label: 'Extra instructions',
    placeholder: 'Shown to players together with the IBAN',
    multiline: true,
  },
];

export default function BankTransferSettingsPage() {
  const { showSuccess, showError } = useToast();
  const [form, setForm] = useState<BankTransferSettingsPayload>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const saveStatus = useActionButtonStatus({ auditoryFeedback: true });
  // Toast helpers are recreated on every provider render; a ref keeps `load`
  // stable so the mount effect does not re-fetch in a loop.
  const showErrorRef = useRef(showError);
  showErrorRef.current = showError;

  useBreadcrumbSegments(
    'bank-transfer-settings',
    buildResourceBreadcrumbs({
      sectionLabel: 'Bank transfer',
      sectionHref: '/bank-transfer-settings',
    })
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getSettings();
      const settings = response.data;
      setForm(
        settings
          ? {
              iban: settings.iban ?? '',
              beneficiary_name: settings.beneficiary_name ?? '',
              bank_name: settings.bank_name ?? '',
              payment_reference_template:
                settings.payment_reference_template ?? '',
              extra_instructions: settings.extra_instructions ?? '',
            }
          : EMPTY_FORM
      );
    } catch (err: any) {
      showErrorRef.current(
        'Load failed',
        err?.message || 'Could not load settings'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    setErrors({});
    try {
      const response = await api.updateSettings({
        iban: form.iban.trim(),
        beneficiary_name: form.beneficiary_name.trim(),
        bank_name: form.bank_name?.trim() || null,
        payment_reference_template:
          form.payment_reference_template?.trim() || null,
        extra_instructions: form.extra_instructions?.trim() || null,
      });
      const saved = response.data;
      if (saved) {
        setForm(prev => ({
          ...prev,
          iban: saved.iban ?? prev.iban,
          beneficiary_name: saved.beneficiary_name ?? prev.beneficiary_name,
          payment_reference_template:
            saved.payment_reference_template ??
            prev.payment_reference_template,
        }));
      }
      showSuccess('Bank transfer settings saved');
    } catch (err: any) {
      if (err?.errors) setErrors(err.errors);
      showError('Save failed', err?.message || 'Could not save settings');
      throw err;
    }
  }, [form, showError, showSuccess]);

  const headerActions = (
    <ActionButton
      testID="bank-transfer-settings-save"
      label="Save"
      variant="primary"
      status={saveStatus.status}
      errorMessage={saveStatus.errorMessage ?? undefined}
      disabled={loading}
      onPress={() => {
        void saveStatus.run(save);
      }}
    />
  );

  return (
    <AppLayout
      title="Bank transfer"
      description="IBAN details shown to players paying by bank transfer"
      headerActions={headerActions}
    >
      {loading ? (
        <View className="flex-1 justify-center items-center p-6">
          <LoadingSpinner text="Loading settings..." />
        </View>
      ) : (
        <View className="p-4">
          <View
            className="bg-white border rounded-lg p-4"
            testID="bank-transfer-settings-form"
          >
            {FIELDS.map(field => (
              <View key={field.key} className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                </Text>
                <AppTextInput
                  testID={`bank-transfer-${field.key}`}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder={field.placeholder}
                  multiline={field.multiline}
                  value={form[field.key] ?? ''}
                  onChangeText={text =>
                    setForm(prev => ({ ...prev, [field.key]: text }))
                  }
                />
                {errors[field.key]?.map(message => (
                  <Text
                    key={message}
                    testID={`bank-transfer-error-${field.key}`}
                    className="text-red-600 text-sm mt-1"
                  >
                    {message}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </View>
      )}
    </AppLayout>
  );
}
