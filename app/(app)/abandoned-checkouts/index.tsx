import RegistrationQueueList from '@/components/registrations/RegistrationQueueList';
import React from 'react';

export default function AbandonedCheckoutsPage() {
  return <RegistrationQueueList queue="abandoned_netopia" />;
}
