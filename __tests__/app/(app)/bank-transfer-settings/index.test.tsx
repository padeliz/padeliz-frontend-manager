/**
 * @jest-environment jsdom
 */
import BankTransferSettingsPage from '@/app/(app)/bank-transfer-settings/index';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockGetSettings = jest.fn();
const mockUpdateSettings = jest.fn();
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('@/services/api/bankTransferSettingsApi', () => ({
  BankTransferSettingsApiService: jest.fn().mockImplementation(() => ({
    getSettings: (...args: unknown[]) => mockGetSettings(...args),
    updateSettings: (...args: unknown[]) => mockUpdateSettings(...args),
  })),
}));

jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showSuccess: (...args: unknown[]) => mockShowSuccess(...args),
    showError: (...args: unknown[]) => mockShowError(...args),
  }),
}));

jest.mock('@/components/layout/AppLayout', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, headerActions }: any) => (
      <View>
        <View testID="app-header-actions">{headerActions}</View>
        {children}
      </View>
    ),
  };
});

jest.mock('@/components/layout/BreadcrumbProvider', () => ({
  useBreadcrumbSegments: jest.fn(),
}));

describe('BankTransferSettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateSettings.mockResolvedValue({
      data: {
        id_bank_transfer_settings: 1,
        iban: 'RO49AAAA',
        beneficiary_name: 'Padeliz',
      },
    });
  });

  it('loads existing settings into the form', async () => {
    mockGetSettings.mockResolvedValue({
      data: {
        id_bank_transfer_settings: 1,
        iban: 'RO49AAAA',
        beneficiary_name: 'Padeliz SRL',
        bank_name: 'BT',
        payment_reference_template: 'PAD-{checkout_id}',
        extra_instructions: null,
      },
    });

    const { getByTestId } = render(<BankTransferSettingsPage />);

    await waitFor(() => {
      expect(getByTestId('bank-transfer-settings-form')).toBeTruthy();
    });
    expect(getByTestId('bank-transfer-iban').props.value).toBe('RO49AAAA');
    expect(getByTestId('bank-transfer-beneficiary_name').props.value).toBe(
      'Padeliz SRL'
    );
    expect(
      getByTestId('bank-transfer-payment_reference_template').props.value
    ).toBe('PAD-{checkout_id}');
    expect(getByTestId('bank-transfer-extra_instructions').props.value).toBe(
      ''
    );
  });

  it('starts empty when nothing is configured yet and saves edits', async () => {
    mockGetSettings.mockResolvedValue({ data: null });

    const { getByTestId } = render(<BankTransferSettingsPage />);
    await waitFor(() => {
      expect(getByTestId('bank-transfer-settings-form')).toBeTruthy();
    });
    expect(getByTestId('bank-transfer-iban').props.value).toBe('');

    fireEvent.changeText(getByTestId('bank-transfer-iban'), ' RO49AAAA ');
    fireEvent.changeText(
      getByTestId('bank-transfer-beneficiary_name'),
      'Padeliz'
    );
    fireEvent.press(getByTestId('bank-transfer-settings-save'));

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith({
        iban: 'RO49AAAA',
        beneficiary_name: 'Padeliz',
        bank_name: null,
        payment_reference_template: null,
        extra_instructions: null,
      });
    });
    expect(mockShowSuccess).toHaveBeenCalled();
  });

  it('surfaces field validation errors from the API', async () => {
    mockGetSettings.mockResolvedValue({ data: null });
    mockUpdateSettings.mockRejectedValue({
      message: 'Validation failed',
      errors: { iban: ['The iban field is required.'] },
    });

    const { getByTestId } = render(<BankTransferSettingsPage />);
    await waitFor(() => {
      expect(getByTestId('bank-transfer-settings-form')).toBeTruthy();
    });

    fireEvent.press(getByTestId('bank-transfer-settings-save'));

    await waitFor(() => {
      expect(getByTestId('bank-transfer-error-iban')).toHaveTextContent(
        'The iban field is required.'
      );
    });
    expect(mockShowError).toHaveBeenCalled();
  });
});
