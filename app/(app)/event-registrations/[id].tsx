import ResourceViewPage from '@/components/pages/ResourceViewPage';
import RegistrationPaymentPanel, {
  feesAreLocked,
} from '@/components/registrations/RegistrationPaymentPanel';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { EventRegistrationsApiService } from '@/services/api/eventRegistrationsApi';
import { ApiEventRegistration } from '@/types/api/entities';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';

const api = new EventRegistrationsApiService();

/** Fees are frozen by the backend once the registration is paid or refunding. */
const FEE_FIELDS = ['payment'];

export default function ViewEventRegistrationPage() {
  const params = useLocalSearchParams<{ id: string }>();
  const registrationId = Number(params.id);
  const [feesLocked, setFeesLocked] = useState(false);
  // Bumped after a payment action so the metadata-driven fields reload too.
  const [reloadKey, setReloadKey] = useState(0);

  const fetchResource = useCallback(async (id: string | number) => {
    const response = await api.getRegistration(Number(id));
    setFeesLocked(feesAreLocked(response.data));
    return response;
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiEventRegistration>) => {
      return api.updateRegistration(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiEventRegistration>({
    resourceName: 'EventRegistration',
    resourceDisplayName: 'Registration',
    sectionLabel: 'Registrations',
    sectionHref: '/event-registrations',
    fetchResource,
    updateResource,
    excludeFields: ['discount'],
    readOnlyFields: feesLocked ? FEE_FIELDS : undefined,
    footer: Number.isFinite(registrationId) ? (
      <RegistrationPaymentPanel
        registrationId={registrationId}
        onChanged={() => setReloadKey(prev => prev + 1)}
      />
    ) : null,
  });

  return <ResourceViewPage key={reloadKey} config={config} />;
}
