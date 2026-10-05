import RegistrationQueueList from '@/components/registrations/RegistrationQueueList';
import React from 'react';

export default function PaymentProofsPage() {
  return <RegistrationQueueList queue="awaiting_proof" />;
}
