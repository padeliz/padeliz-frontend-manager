import { ApiBankTransferSettings } from '@/types/api/entities';
import { BaseApiService } from './baseApi';

export interface BankTransferSettingsPayload {
  iban: string;
  beneficiary_name: string;
  bank_name?: string | null;
  payment_reference_template?: string | null;
  extra_instructions?: string | null;
}

export class BankTransferSettingsApiService extends BaseApiService {
  /** `data` is null until a manager saves the settings for the first time. */
  async getSettings(): Promise<{ data: ApiBankTransferSettings | null }> {
    return this.get<{ data: ApiBankTransferSettings | null }>(
      '/bank-transfer-settings'
    );
  }

  async updateSettings(
    payload: BankTransferSettingsPayload
  ): Promise<{ data: ApiBankTransferSettings }> {
    return this.put<{ data: ApiBankTransferSettings }>(
      '/bank-transfer-settings',
      payload
    );
  }
}
