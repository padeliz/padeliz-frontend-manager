import AbandonedCheckoutsPage from '@/app/(app)/abandoned-checkouts/index';
import PaymentProofsPage from '@/app/(app)/payment-proofs/index';
import RefundsPage from '@/app/(app)/refunds/index';
import { render } from '@testing-library/react-native';
import React from 'react';

const mockQueue = jest.fn();

jest.mock('@/components/registrations/RegistrationQueueList', () => {
  const { Text, View } = require('react-native');
  return {
    __esModule: true,
    default: ({ queue }: { queue: string }) => {
      mockQueue(queue);
      return (
        <View testID={`queue-page-${queue}`}>
          <Text>{queue}</Text>
        </View>
      );
    },
  };
});

describe('Global registration queue pages', () => {
  beforeEach(() => {
    mockQueue.mockClear();
  });

  it('wires payment-proofs to awaiting_proof', () => {
    render(<PaymentProofsPage />);
    expect(mockQueue).toHaveBeenCalledWith('awaiting_proof');
  });

  it('wires refunds to refund_pending', () => {
    render(<RefundsPage />);
    expect(mockQueue).toHaveBeenCalledWith('refund_pending');
  });

  it('wires abandoned-checkouts to abandoned_netopia', () => {
    render(<AbandonedCheckoutsPage />);
    expect(mockQueue).toHaveBeenCalledWith('abandoned_netopia');
  });
});
