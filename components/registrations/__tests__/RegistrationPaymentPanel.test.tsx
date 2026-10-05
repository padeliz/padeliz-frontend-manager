/**
 * @jest-environment jsdom
 */
import RegistrationPaymentPanel, {
  feesAreLocked,
} from '@/components/registrations/RegistrationPaymentPanel';
import { queryKeys } from '@/lib/queryClient';
import {
  createTestQueryClient,
  disposeTestQueryClient,
} from '@/testing/createTestQueryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockGetRegistration = jest.fn();
const mockCancel = jest.fn();
const mockDecline = jest.fn();
const mockMarkRefunded = jest.fn();
const mockManualAdjustment = jest.fn();
const mockApproveProof = jest.fn();
const mockRejectProof = jest.fn();
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('@/services/api/eventRegistrationsApi', () => {
  const actual = jest.requireActual('@/services/api/eventRegistrationsApi');
  return {
    ...actual,
    EventRegistrationsApiService: jest.fn().mockImplementation(() => ({
      getRegistration: (...args: unknown[]) => mockGetRegistration(...args),
      cancelRegistration: (...args: unknown[]) => mockCancel(...args),
      declineRegistration: (...args: unknown[]) => mockDecline(...args),
      markRegistrationRefunded: (...args: unknown[]) =>
        mockMarkRefunded(...args),
      applyManualAdjustment: (...args: unknown[]) =>
        mockManualAdjustment(...args),
    })),
  };
});

jest.mock('@/services/api/registrationPaymentProofsApi', () => ({
  RegistrationPaymentProofsApiService: jest.fn().mockImplementation(() => ({
    approveProof: (...args: unknown[]) => mockApproveProof(...args),
    rejectProof: (...args: unknown[]) => mockRejectProof(...args),
  })),
}));

jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showSuccess: (...args: unknown[]) => mockShowSuccess(...args),
    showError: (...args: unknown[]) => mockShowError(...args),
  }),
}));

jest.mock('@/components/ui/SingleSelectDropdown', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');
  return {
    __esModule: true,
    default: ({ options, onSelectionChange, placeholder }: any) => (
      <View>
        <Text>{placeholder}</Text>
        {options.map((opt: any) => (
          <Pressable
            key={String(opt.value)}
            testID={`dropdown-option-${opt.value}`}
            onPress={() => onSelectionChange(opt.value)}
          >
            <Text>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
    ),
  };
});

function registration(overrides: Record<string, any> = {}) {
  return {
    id_registration: 4,
    event_id: 1,
    player_id: 2,
    is_minor: false,
    is_student: false,
    payment: 50,
    amount_due: 50,
    payment_due_at: null,
    is_overdue: false,
    redemptions: [],
    lifecycle_status: 'active',
    payment_status: 'unpaid',
    payment_method: null,
    inserted_at: 1,
    payment_proofs: [],
    payment_attempts: [],
    event: {
      id_event: 1,
      date: '2099-01-01',
      finalized_at: null,
    },
    ...overrides,
  };
}

async function renderPanel(data: Record<string, any>) {
  mockGetRegistration.mockResolvedValue({ data });
  const queryClient = createTestQueryClient();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RegistrationPaymentPanel registrationId={4} />
    </QueryClientProvider>
  );
  await waitFor(() => {
    expect(utils.getByTestId('registration-payment-panel')).toBeTruthy();
  });
  return { ...utils, queryClient };
}

describe('RegistrationPaymentPanel', () => {
  let activeClient: ReturnType<typeof createTestQueryClient> | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCancel.mockResolvedValue({ data: registration() });
    mockDecline.mockResolvedValue({ data: registration() });
    mockMarkRefunded.mockResolvedValue({ data: registration() });
    mockApproveProof.mockResolvedValue({ data: registration() });
    mockRejectProof.mockResolvedValue({ data: registration() });
  });

  afterEach(async () => {
    if (activeClient) {
      await disposeTestQueryClient(activeClient);
      activeClient = null;
    }
  });

  it('shows the payment summary', async () => {
    const { getByTestId, queryClient } = await renderPanel(
      registration({ payment_status: 'paid', payment_method: 'netopia' })
    );
    activeClient = queryClient;
    expect(getByTestId('registration-payment-status')).toHaveTextContent(
      /Paid/
    );
    expect(getByTestId('registration-amount-due')).toHaveTextContent(/50/);
    expect(getByTestId('registration-payment-method')).toHaveTextContent(
      /Netopia card/
    );
  });

  it('renders payment attempts trail including error_message', async () => {
    const { getByTestId, queryClient } = await renderPanel(
      registration({
        payment_attempts: [
          {
            id_payment_attempt: 3,
            amount: 50,
            currency: 'RON',
            status: 'failed',
            order_id: 'PAD-4-abc',
            error_message: 'Card declined by issuer',
            inserted_at: 20,
          },
        ],
      })
    );
    activeClient = queryClient;
    expect(getByTestId('payment-attempt-3')).toBeTruthy();
    expect(getByTestId('payment-attempt-error-3')).toHaveTextContent(
      /Card declined by issuer/
    );
  });

  it('shows finalized banner and keeps proof actions available', async () => {
    const { getByTestId, queryClient } = await renderPanel(
      registration({
        payment_status: 'awaiting_proof_review',
        event: {
          id_event: 1,
          date: '2099-01-01',
          finalized_at: 123,
        },
        payment_proofs: [
          {
            id_payment_proof: 9,
            url: 'https://cdn.test/proof.png',
            review_status: 'pending',
            inserted_at: 10,
          },
        ],
      })
    );
    activeClient = queryClient;
    expect(getByTestId('registration-event-context-banner')).toHaveTextContent(
      /finalized/
    );
    expect(getByTestId('proof-approve-9')).toBeTruthy();
    expect(getByTestId('proof-reject-9')).toBeTruthy();

    fireEvent.press(getByTestId('dropdown-option-injury_or_illness'));
    fireEvent.press(getByTestId('registration-cancel-submit'));
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('shows past-date banner', async () => {
    const { getByTestId, queryClient } = await renderPanel(
      registration({
        event: {
          id_event: 1,
          date: '2000-01-01',
          finalized_at: null,
        },
      })
    );
    activeClient = queryClient;
    expect(getByTestId('registration-event-context-banner')).toHaveTextContent(
      /passed/
    );
  });

  it('shows combined finalized and past banner', async () => {
    const { getByTestId, queryClient } = await renderPanel(
      registration({
        event: {
          id_event: 1,
          date: '2000-01-01',
          finalized_at: 99,
        },
      })
    );
    activeClient = queryClient;
    expect(getByTestId('registration-event-context-banner')).toHaveTextContent(
      /finalized/
    );
    expect(getByTestId('registration-event-context-banner')).toHaveTextContent(
      /passed/
    );
  });

  it('keeps mark-refunded available when finalized', async () => {
    const { getByTestId, queryClient } = await renderPanel(
      registration({
        lifecycle_status: 'cancelled',
        payment_status: 'refund_pending',
        event: {
          id_event: 1,
          date: '2099-01-01',
          finalized_at: 50,
        },
      })
    );
    activeClient = queryClient;
    fireEvent.press(getByTestId('registration-mark-refunded'));
    await waitFor(() => {
      expect(mockMarkRefunded).toHaveBeenCalledWith(4);
    });
  });

  it('locks fees for paid and non-active lifecycle', () => {
    expect(
      feesAreLocked({ payment_status: 'paid', lifecycle_status: 'active' })
    ).toBe(true);
    expect(
      feesAreLocked({
        payment_status: 'refund_pending',
        lifecycle_status: 'active',
      })
    ).toBe(true);
    expect(
      feesAreLocked({ payment_status: 'unpaid', lifecycle_status: 'cancelled' })
    ).toBe(true);
    expect(
      feesAreLocked({ payment_status: 'unpaid', lifecycle_status: 'active' })
    ).toBe(false);
  });

  it('shows overdue badge and redemptions breakdown', async () => {
    const { getByTestId, queryClient } = await renderPanel(
      registration({
        is_overdue: true,
        payment_due_at: 1_700_000_000,
        amount_due: 40,
        redemptions: [
          {
            id_redemption: 9,
            benefit_definition_id: 3,
            benefit_name: 'Early bird',
            amount_ron: 10,
            selection_source: 'auto',
            reason: null,
          },
        ],
      })
    );
    activeClient = queryClient;
    expect(getByTestId('registration-overdue-badge')).toBeTruthy();
    expect(getByTestId('registration-redemption-9')).toHaveTextContent(
      /Early bird/
    );
    expect(getByTestId('registration-redemption-9')).toHaveTextContent(/10/);
  });

  it('applies manual adjustment while unpaid', async () => {
    mockManualAdjustment.mockResolvedValue({
      data: registration({ amount_due: 40 }),
    });
    const { getByTestId, queryClient } = await renderPanel(registration());
    activeClient = queryClient;
    fireEvent.changeText(getByTestId('registration-adjustment-amount'), '10');
    fireEvent.changeText(
      getByTestId('registration-adjustment-reason'),
      'Manager courtesy'
    );
    fireEvent.press(getByTestId('registration-adjustment-submit'));
    await waitFor(() => {
      expect(mockManualAdjustment).toHaveBeenCalledWith(4, {
        amount_ron: 10,
        reason: 'Manager courtesy',
      });
    });
  });

  it('disables manual adjustment when fees are locked', async () => {
    const { getByTestId, queryClient } = await renderPanel(
      registration({ payment_status: 'paid' })
    );
    activeClient = queryClient;
    expect(getByTestId('registration-adjustment-submit').props.accessibilityState?.disabled ||
      getByTestId('registration-adjustment-submit').props.disabled).toBeTruthy();
  });

  it('invalidates queue counts after successful approve', async () => {
    const { getByTestId, queryClient } = await renderPanel(
      registration({
        payment_status: 'awaiting_proof_review',
        payment_proofs: [
          {
            id_payment_proof: 9,
            url: 'https://cdn.test/proof.png',
            review_status: 'pending',
            inserted_at: 10,
          },
        ],
      })
    );
    activeClient = queryClient;
    const spy = jest.spyOn(queryClient, 'invalidateQueries');

    fireEvent.press(getByTestId('proof-approve-9'));
    await waitFor(() => {
      expect(mockApproveProof).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: queryKeys.registrationQueueCounts(),
        })
      );
    });
  });

  it('wires proof approve with the review message', async () => {
    const { getByTestId, queryClient } = await renderPanel(
      registration({
        payment_status: 'awaiting_proof_review',
        payment_method: 'bank_transfer',
        payment_proofs: [
          {
            id_payment_proof: 9,
            url: 'https://cdn.test/proof.png',
            review_status: 'pending',
            inserted_at: 10,
          },
        ],
      })
    );
    activeClient = queryClient;

    fireEvent.changeText(getByTestId('proof-review-message-9'), 'Verified');
    fireEvent.press(getByTestId('proof-approve-9'));

    await waitFor(() => {
      expect(mockApproveProof).toHaveBeenCalledWith(9, 'Verified');
    });
    expect(mockRejectProof).not.toHaveBeenCalled();
  });

  it('wires proof reject and sends no message when blank', async () => {
    const { getByTestId, queryClient } = await renderPanel(
      registration({
        payment_status: 'awaiting_proof_review',
        payment_proofs: [
          {
            id_payment_proof: 9,
            url: 'https://cdn.test/proof.png',
            review_status: 'pending',
            inserted_at: 10,
          },
        ],
      })
    );
    activeClient = queryClient;

    fireEvent.press(getByTestId('proof-reject-9'));

    await waitFor(() => {
      expect(mockRejectProof).toHaveBeenCalledWith(9, null);
    });
  });

  it('offers no review controls for an already reviewed proof', async () => {
    const { queryByTestId, queryClient } = await renderPanel(
      registration({
        payment_status: 'paid',
        payment_proofs: [
          {
            id_payment_proof: 9,
            url: 'https://cdn.test/proof.png',
            review_status: 'approved',
            inserted_at: 10,
          },
        ],
      })
    );
    activeClient = queryClient;
    expect(queryByTestId('proof-approve-9')).toBeNull();
    expect(queryByTestId('proof-reject-9')).toBeNull();
  });

  it('requires a cancel reason before cancelling', async () => {
    const { getByTestId, queryClient } = await renderPanel(registration());
    activeClient = queryClient;

    fireEvent.press(getByTestId('registration-cancel-submit'));
    expect(mockCancel).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('dropdown-option-injury_or_illness'));
    fireEvent.press(getByTestId('registration-cancel-submit'));

    await waitFor(() => {
      expect(mockCancel).toHaveBeenCalledWith(4, 'injury_or_illness');
    });
  });

  it('requires a decline reason before declining', async () => {
    const { getByTestId, queryClient } = await renderPanel(registration());
    activeClient = queryClient;

    fireEvent.press(getByTestId('registration-decline-submit'));
    expect(mockDecline).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('dropdown-option-payment_not_completed'));
    fireEvent.press(getByTestId('registration-decline-submit'));

    await waitFor(() => {
      expect(mockDecline).toHaveBeenCalledWith(4, 'payment_not_completed');
    });
  });

  it('hides cancel and decline once the registration is no longer active', async () => {
    const { queryByTestId, getByTestId, queryClient } = await renderPanel(
      registration({
        lifecycle_status: 'cancelled',
        cancel_reason: 'travel_issue',
        cancelled_at: 100,
        payment_status: 'unpaid',
      })
    );
    activeClient = queryClient;
    expect(queryByTestId('registration-cancel-submit')).toBeNull();
    expect(queryByTestId('registration-decline-submit')).toBeNull();
    expect(getByTestId('registration-cancel-reason-value')).toHaveTextContent(
      /travel issue/
    );
  });

  it('shows Mark refunded for refund_pending', async () => {
    const { getByTestId, queryClient } = await renderPanel(
      registration({
        lifecycle_status: 'cancelled',
        payment_status: 'refund_pending',
      })
    );
    activeClient = queryClient;
    fireEvent.press(getByTestId('registration-mark-refunded'));
    await waitFor(() => {
      expect(mockMarkRefunded).toHaveBeenCalledWith(4);
    });
  });

  it('hides Mark refunded once the refund is settled', async () => {
    const { queryByTestId, queryClient } = await renderPanel(
      registration({
        lifecycle_status: 'cancelled',
        payment_status: 'refunded',
      })
    );
    activeClient = queryClient;
    expect(queryByTestId('registration-mark-refunded')).toBeNull();
  });
});
