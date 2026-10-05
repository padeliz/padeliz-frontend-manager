import { ApiEventRegistration } from '@/types/api/entities';
import { BaseApiService } from './baseApi';

/**
 * Bank transfer proof review. Both endpoints return the refreshed registration.
 */
export class RegistrationPaymentProofsApiService extends BaseApiService {
  async approveProof(
    proofId: number,
    reviewMessage?: string | null
  ): Promise<{ data: ApiEventRegistration }> {
    return this.post<{ data: ApiEventRegistration }>(
      `/payment-proofs/${proofId}/approve`,
      reviewMessage ? { review_message: reviewMessage } : undefined
    );
  }

  async rejectProof(
    proofId: number,
    reviewMessage?: string | null
  ): Promise<{ data: ApiEventRegistration }> {
    return this.post<{ data: ApiEventRegistration }>(
      `/payment-proofs/${proofId}/reject`,
      reviewMessage ? { review_message: reviewMessage } : undefined
    );
  }
}
