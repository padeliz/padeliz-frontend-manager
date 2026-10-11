/**
 * Registration payment & lifecycle review (Netopia + bank transfer).
 *
 * Registrations are never hard-deleted: managers cancel or decline them with a
 * locked reason, review bank transfer proofs, and settle refunds here.
 */

import ActionButton from '@/components/ui/ActionButton';
import AppTextInput from '@/components/ui/AppTextInput';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import { useToast } from '@/context/ToastContext';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { queryKeys } from '@/lib/queryClient';
import {
  EventRegistrationsApiService,
  REGISTRATION_CANCEL_REASONS,
  REGISTRATION_DECLINE_REASONS,
} from '@/services/api/eventRegistrationsApi';
import { RegistrationPaymentProofsApiService } from '@/services/api/registrationPaymentProofsApi';
import {
  ApiEventRegistration,
  ApiRegistrationCancelReason,
  ApiRegistrationDeclineReason,
  ApiRegistrationPaymentAttempt,
  ApiRegistrationPaymentProof,
} from '@/types/api/entities';
import { useQueryClient } from '@tanstack/react-query';
import { classifyTiming } from '@/utils/productDateTime';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

const registrationsApi = new EventRegistrationsApiService();
const proofsApi = new RegistrationPaymentProofsApiService();

const LIFECYCLE_LABELS: Record<string, string> = {
  active: 'Active',
  cancelled: 'Cancelled',
  declined: 'Declined',
};

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: 'Unpaid',
  awaiting_proof_review: 'Awaiting proof review',
  paid: 'Paid',
  refund_pending: 'Refund pending',
  refunded: 'Refunded',
};

const METHOD_LABELS: Record<string, string> = {
  netopia: 'Netopia card',
  bank_transfer: 'Bank transfer',
};

/** Fees are frozen once money moved; the backend answers 422 on a change. */
export const FEE_LOCKED_PAYMENT_STATUSES = [
  'paid',
  'refund_pending',
  'refunded',
];

export function feesAreLocked(
  registration:
    | Pick<ApiEventRegistration, 'payment_status' | 'lifecycle_status'>
    | null
    | undefined
): boolean {
  if (!registration) return false;
  if (
    registration.lifecycle_status &&
    registration.lifecycle_status !== 'active'
  ) {
    return true;
  }
  if (!registration.payment_status) return false;
  return FEE_LOCKED_PAYMENT_STATUSES.includes(registration.payment_status);
}

function formatTimestamp(ts?: number | null): string {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleString();
}

function humanize(value?: string | null): string {
  if (!value) return '—';
  return value.replace(/_/g, ' ');
}

function todayYmd(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function isEventPast(
  event?: { event_starts_at?: number; event_ends_at?: number } | null
): boolean {
  if (event?.event_starts_at == null || event?.event_ends_at == null) {
    return false;
  }
  return classifyTiming(event.event_starts_at, event.event_ends_at) === 'past';
}

export function isEventFinalized(
  event?: { finalized_at?: number | null } | null
): boolean {
  return event?.finalized_at != null;
}

type Props = {
  registrationId: number;
  /** Called after any mutation so the surrounding detail view can refetch. */
  onChanged?: () => void;
};

export default function RegistrationPaymentPanel({
  registrationId,
  onChanged,
}: Props) {
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const [registration, setRegistration] =
    useState<ApiEventRegistration | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelReason, setCancelReason] =
    useState<ApiRegistrationCancelReason | null>(null);
  const [declineReason, setDeclineReason] =
    useState<ApiRegistrationDeclineReason | null>(null);
  const [reviewMessages, setReviewMessages] = useState<Record<number, string>>(
    {}
  );
  /** Only the proof currently under review reflects the shared button status. */
  const [activeProofId, setActiveProofId] = useState<number | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const cancelStatus = useActionButtonStatus();
  const declineStatus = useActionButtonStatus();
  const refundStatus = useActionButtonStatus();
  const proofStatus = useActionButtonStatus();
  const adjustmentStatus = useActionButtonStatus({ auditoryFeedback: true });
  // Toast helpers are recreated on every provider render; a ref keeps `load`
  // stable so the mount effect does not re-fetch in a loop.
  const showErrorRef = useRef(showError);
  showErrorRef.current = showError;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await registrationsApi.getRegistration(registrationId);
      setRegistration(response.data);
    } catch (err: any) {
      showErrorRef.current(
        'Load failed',
        err?.message || 'Could not load payment state'
      );
    } finally {
      setLoading(false);
    }
  }, [registrationId]);

  useEffect(() => {
    if (Number.isFinite(registrationId)) void load();
  }, [load, registrationId]);

  const invalidateQueueCounts = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.registrationQueueCounts(),
    });
  }, [queryClient]);

  const afterMutation = useCallback(
    async (updated?: ApiEventRegistration) => {
      if (updated) setRegistration(updated);
      await load();
      await invalidateQueueCounts();
      onChanged?.();
    },
    [invalidateQueueCounts, load, onChanged]
  );

  const runCancel = useCallback(async () => {
    if (!cancelReason) return;
    try {
      const response = await registrationsApi.cancelRegistration(
        registrationId,
        cancelReason
      );
      showSuccess('Registration cancelled');
      setCancelReason(null);
      await afterMutation(response.data);
    } catch (err: any) {
      showError('Cancel failed', err?.message || 'Could not cancel');
      throw err;
    }
  }, [afterMutation, cancelReason, registrationId, showError, showSuccess]);

  const runDecline = useCallback(async () => {
    if (!declineReason) return;
    try {
      const response = await registrationsApi.declineRegistration(
        registrationId,
        declineReason
      );
      showSuccess('Registration declined');
      setDeclineReason(null);
      await afterMutation(response.data);
    } catch (err: any) {
      showError('Decline failed', err?.message || 'Could not decline');
      throw err;
    }
  }, [afterMutation, declineReason, registrationId, showError, showSuccess]);

  const runMarkRefunded = useCallback(async () => {
    try {
      const response =
        await registrationsApi.markRegistrationRefunded(registrationId);
      showSuccess('Marked as refunded');
      await afterMutation(response.data);
    } catch (err: any) {
      showError('Refund failed', err?.message || 'Could not mark refunded');
      throw err;
    }
  }, [afterMutation, registrationId, showError, showSuccess]);

  const runManualAdjustment = useCallback(async () => {
    const amount = Math.trunc(Number(adjustmentAmount));
    const reason = adjustmentReason.trim();
    if (!Number.isFinite(amount) || amount < 0 || !reason) {
      showError(
        'Adjustment failed',
        'Enter a non-negative amount and a reason'
      );
      throw new Error('Invalid adjustment');
    }
    try {
      const response = await registrationsApi.applyManualAdjustment(
        registrationId,
        { amount_ron: amount, reason }
      );
      showSuccess('Manual adjustment applied');
      setAdjustmentAmount('');
      setAdjustmentReason('');
      await afterMutation(response.data);
    } catch (err: any) {
      showError(
        'Adjustment failed',
        err?.message || 'Could not apply adjustment'
      );
      throw err;
    }
  }, [
    adjustmentAmount,
    adjustmentReason,
    afterMutation,
    registrationId,
    showError,
    showSuccess,
  ]);

  const reviewProof = useCallback(
    async (proofId: number, approve: boolean) => {
      const message = reviewMessages[proofId]?.trim() || null;
      try {
        if (approve) {
          await proofsApi.approveProof(proofId, message);
          showSuccess('Proof approved');
        } else {
          await proofsApi.rejectProof(proofId, message);
          showSuccess('Proof rejected');
        }
        await afterMutation();
      } catch (err: any) {
        showError(
          approve ? 'Approve failed' : 'Reject failed',
          err?.message || 'Could not review proof'
        );
        throw err;
      }
    },
    [afterMutation, reviewMessages, showError, showSuccess]
  );

  if (loading && !registration) {
    return (
      <View className="p-4" testID="registration-payment-panel-loading">
        <LoadingSpinner text="Loading payment state..." />
      </View>
    );
  }

  if (!registration) return null;

  const lifecycle = registration.lifecycle_status ?? 'active';
  const paymentStatus = registration.payment_status ?? 'unpaid';
  const isActive = lifecycle === 'active';
  const eventFinalized = isEventFinalized(registration.event);
  const eventPast = isEventPast(registration.event);
  const cancelDeclineDisabled = eventFinalized;
  const proofs: ApiRegistrationPaymentProof[] =
    registration.payment_proofs ?? [];
  const attempts: ApiRegistrationPaymentAttempt[] =
    registration.payment_attempts ?? [];

  let contextBanner: string | null = null;
  if (eventFinalized && eventPast) {
    contextBanner =
      'This event is finalized and its date has passed. Proof review and refunds remain available; cancel and decline are disabled.';
  } else if (eventFinalized) {
    contextBanner =
      'This event is finalized. Proof review and refunds remain available; cancel and decline are disabled.';
  } else if (eventPast) {
    contextBanner =
      'This event date has passed. Payment review actions remain available.';
  }

  return (
    <View
      className="bg-white border rounded-lg p-4 mb-8"
      testID="registration-payment-panel"
    >
      <Text className="text-base font-semibold text-gray-800 mb-3">
        Payment & lifecycle
      </Text>

      {contextBanner ? (
        <Text
          testID="registration-event-context-banner"
          className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-4"
        >
          {contextBanner}
        </Text>
      ) : null}

      <View className="flex-row flex-wrap gap-x-6 gap-y-2 mb-4">
        <Text testID="registration-lifecycle-status" className="text-sm text-gray-700">
          Status: {LIFECYCLE_LABELS[lifecycle] ?? lifecycle}
        </Text>
        <Text testID="registration-payment-status" className="text-sm text-gray-700">
          Payment: {PAYMENT_LABELS[paymentStatus] ?? paymentStatus}
        </Text>
        <Text testID="registration-amount-due" className="text-sm text-gray-700">
          Amount due: {registration.amount_due ?? '—'} RON
        </Text>
        <Text testID="registration-payment-method" className="text-sm text-gray-700">
          Method:{' '}
          {registration.payment_method
            ? (METHOD_LABELS[registration.payment_method] ??
              registration.payment_method)
            : '—'}
        </Text>
        <Text testID="registration-paid-at" className="text-sm text-gray-700">
          Paid at: {formatTimestamp(registration.paid_at)}
        </Text>
        <Text testID="registration-payment-due-at" className="text-sm text-gray-700">
          Due at: {formatTimestamp(registration.payment_due_at)}
        </Text>
        {registration.is_overdue ? (
          <Text
            testID="registration-overdue-badge"
            className="text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded px-2 py-0.5"
          >
            Overdue
          </Text>
        ) : null}
      </View>

      {registration.cancel_reason ? (
        <Text testID="registration-cancel-reason-value" className="text-sm text-gray-600 mb-2">
          Cancelled ({humanize(registration.cancel_reason)}) on{' '}
          {formatTimestamp(registration.cancelled_at)}
        </Text>
      ) : null}
      {registration.decline_reason ? (
        <Text testID="registration-decline-reason-value" className="text-sm text-gray-600 mb-2">
          Declined ({humanize(registration.decline_reason)}) on{' '}
          {formatTimestamp(registration.declined_at)}
        </Text>
      ) : null}

      {feesAreLocked(registration) ? (
        <Text
          testID="registration-fees-locked-hint"
          className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-4"
        >
          Payment and manual adjustments are read-only once the registration is
          paid, refunding, or no longer active.
        </Text>
      ) : null}

      <Text className="text-sm font-semibold text-gray-800 mb-2">
        Benefit redemptions
      </Text>
      {(registration.redemptions ?? []).length === 0 ? (
        <Text
          testID="registration-no-redemptions"
          className="text-sm text-gray-500 mb-4"
        >
          No redemptions applied.
        </Text>
      ) : (
        <View testID="registration-redemptions" className="mb-4 gap-2">
          {(registration.redemptions ?? []).map(redemption => (
            <View
              key={redemption.id_redemption}
              testID={`registration-redemption-${redemption.id_redemption}`}
              className="border border-gray-200 rounded-lg p-3"
            >
              <Text className="text-sm text-gray-800">
                {redemption.benefit_name ||
                  `Benefit #${redemption.benefit_definition_id ?? '—'}`}{' '}
                — −{redemption.amount_ron} RON
              </Text>
              {redemption.reason ? (
                <Text className="text-xs text-gray-500 mt-1">
                  {redemption.reason}
                </Text>
              ) : null}
              {redemption.selection_source ? (
                <Text className="text-xs text-gray-500 mt-1">
                  Source: {humanize(String(redemption.selection_source))}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      <View
        testID="registration-manual-adjustment"
        className="border border-gray-200 rounded-lg p-3 mb-4 gap-2"
      >
        <Text className="text-sm font-semibold text-gray-800">
          Manual adjustment
        </Text>
        <AppTextInput
          testID="registration-adjustment-amount"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          keyboardType="numeric"
          placeholder="Amount RON"
          editable={!feesAreLocked(registration)}
          value={adjustmentAmount}
          onChangeText={setAdjustmentAmount}
        />
        <AppTextInput
          testID="registration-adjustment-reason"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder="Reason"
          editable={!feesAreLocked(registration)}
          value={adjustmentReason}
          onChangeText={setAdjustmentReason}
        />
        <ActionButton
          testID="registration-adjustment-submit"
          label="Apply adjustment"
          variant="secondary"
          size="sm"
          disabled={feesAreLocked(registration)}
          status={adjustmentStatus.status}
          errorMessage={adjustmentStatus.errorMessage ?? undefined}
          onPress={() => {
            void adjustmentStatus.run(runManualAdjustment);
          }}
        />
      </View>

      <Text className="text-sm font-semibold text-gray-800 mb-2">
        Payment attempts
      </Text>
      {attempts.length === 0 ? (
        <Text
          testID="registration-no-attempts"
          className="text-sm text-gray-500 mb-4"
        >
          No Netopia payment attempts.
        </Text>
      ) : (
        <View className="mb-4" testID="registration-payment-attempts">
          {attempts.map(attempt => (
            <View
              key={attempt.id_payment_attempt}
              testID={`payment-attempt-${attempt.id_payment_attempt}`}
              className="border border-gray-200 rounded-lg p-3 mb-2"
            >
              <Text className="text-sm text-gray-700 mb-1">
                #{attempt.id_payment_attempt} — {humanize(attempt.status)} —{' '}
                {attempt.amount} {attempt.currency} —{' '}
                {formatTimestamp(attempt.inserted_at)}
              </Text>
              {attempt.order_id ? (
                <Text className="text-xs text-gray-500 mb-1">
                  Order: {attempt.order_id}
                </Text>
              ) : null}
              {attempt.ntp_id ? (
                <Text className="text-xs text-gray-500 mb-1">
                  Netopia ID: {attempt.ntp_id}
                </Text>
              ) : null}
              {attempt.error_message ? (
                <Text
                  testID={`payment-attempt-error-${attempt.id_payment_attempt}`}
                  className="text-xs text-red-700"
                >
                  {attempt.error_message}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      <Text className="text-sm font-semibold text-gray-800 mb-2">
        Bank transfer proofs
      </Text>
      {proofs.length === 0 ? (
        <Text testID="registration-no-proofs" className="text-sm text-gray-500 mb-4">
          No payment proofs uploaded.
        </Text>
      ) : (
        <View className="mb-4">
          {proofs.map(proof => (
            <View
              key={proof.id_payment_proof}
              testID={`payment-proof-${proof.id_payment_proof}`}
              className="border border-gray-200 rounded-lg p-3 mb-2"
            >
              <Text className="text-sm text-gray-700 mb-1">
                #{proof.id_payment_proof} — {humanize(proof.review_status)} —{' '}
                {formatTimestamp(proof.inserted_at)}
              </Text>
              <Text
                testID={`payment-proof-url-${proof.id_payment_proof}`}
                className="text-xs text-blue-700 mb-2"
              >
                {proof.url}
              </Text>
              {proof.review_message ? (
                <Text className="text-xs text-gray-500 mb-2">
                  {proof.review_message}
                </Text>
              ) : null}

              {proof.review_status === 'pending' ? (
                <View>
                  <AppTextInput
                    testID={`proof-review-message-${proof.id_payment_proof}`}
                    className="border border-gray-300 rounded-lg px-3 py-2 mb-2 text-sm"
                    placeholder="Review message (optional)"
                    value={reviewMessages[proof.id_payment_proof] ?? ''}
                    onChangeText={text =>
                      setReviewMessages(prev => ({
                        ...prev,
                        [proof.id_payment_proof]: text,
                      }))
                    }
                  />
                  <View className="flex-row gap-2">
                    <ActionButton
                      testID={`proof-approve-${proof.id_payment_proof}`}
                      label="Approve"
                      variant="positive"
                      size="sm"
                      status={
                        activeProofId === proof.id_payment_proof
                          ? proofStatus.status
                          : 'idle'
                      }
                      errorMessage={proofStatus.errorMessage ?? undefined}
                      onPress={() => {
                        setActiveProofId(proof.id_payment_proof);
                        void proofStatus.run(() =>
                          reviewProof(proof.id_payment_proof, true)
                        );
                      }}
                    />
                    <ActionButton
                      testID={`proof-reject-${proof.id_payment_proof}`}
                      label="Reject"
                      variant="danger"
                      size="sm"
                      status={
                        activeProofId === proof.id_payment_proof
                          ? proofStatus.status
                          : 'idle'
                      }
                      errorMessage={proofStatus.errorMessage ?? undefined}
                      onPress={() => {
                        setActiveProofId(proof.id_payment_proof);
                        void proofStatus.run(() =>
                          reviewProof(proof.id_payment_proof, false)
                        );
                      }}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {paymentStatus === 'refund_pending' ? (
        <View className="mb-4 self-start">
          <ActionButton
            testID="registration-mark-refunded"
            label="Mark refunded"
            variant="primary"
            size="sm"
            status={refundStatus.status}
            errorMessage={refundStatus.errorMessage ?? undefined}
            onPress={() => {
              void refundStatus.run(runMarkRefunded);
            }}
          />
        </View>
      ) : null}

      {isActive ? (
        <View className="border-t border-gray-200 pt-4">
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-800 mb-2">
              Cancel registration
            </Text>
            <View className="mb-2">
              <SingleSelectDropdown
                title="Cancel reason"
                placeholder="Select a cancel reason"
                options={REGISTRATION_CANCEL_REASONS}
                selectedValue={cancelReason}
                onSelectionChange={value =>
                  setCancelReason(
                    (value as ApiRegistrationCancelReason | null) ?? null
                  )
                }
              />
            </View>
            <View className="self-start">
              <ActionButton
                testID="registration-cancel-submit"
                label="Cancel registration"
                variant="warning"
                size="sm"
                disabled={!cancelReason || cancelDeclineDisabled}
                disabledReason={
                  cancelDeclineDisabled
                    ? 'Event is finalized — cancel is disabled'
                    : 'Select a cancel reason first'
                }
                status={cancelStatus.status}
                errorMessage={cancelStatus.errorMessage ?? undefined}
                onPress={() => {
                  void cancelStatus.run(runCancel);
                }}
              />
            </View>
          </View>

          <View>
            <Text className="text-sm font-semibold text-gray-800 mb-2">
              Decline registration
            </Text>
            <View className="mb-2">
              <SingleSelectDropdown
                title="Decline reason"
                placeholder="Select a decline reason"
                options={REGISTRATION_DECLINE_REASONS}
                selectedValue={declineReason}
                onSelectionChange={value =>
                  setDeclineReason(
                    (value as ApiRegistrationDeclineReason | null) ?? null
                  )
                }
              />
            </View>
            <View className="self-start">
              <ActionButton
                testID="registration-decline-submit"
                label="Decline registration"
                variant="danger"
                size="sm"
                disabled={!declineReason || cancelDeclineDisabled}
                disabledReason={
                  cancelDeclineDisabled
                    ? 'Event is finalized — decline is disabled'
                    : 'Select a decline reason first'
                }
                status={declineStatus.status}
                errorMessage={declineStatus.errorMessage ?? undefined}
                onPress={() => {
                  void declineStatus.run(runDecline);
                }}
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
