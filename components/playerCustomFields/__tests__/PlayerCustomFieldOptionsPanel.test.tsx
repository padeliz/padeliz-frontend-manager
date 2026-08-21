/**
 * @jest-environment jsdom
 */
import PlayerCustomFieldOptionsPanel from '@/components/playerCustomFields/PlayerCustomFieldOptionsPanel';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockGetOptions = jest.fn();
const mockCreateOption = jest.fn();
const mockUpdateOption = jest.fn();
const mockDeleteOption = jest.fn();

jest.mock('@/services/api/playerCustomFieldsApi', () => ({
  PlayerCustomFieldsApiService: jest.fn().mockImplementation(() => ({
    getOptions: (...args: unknown[]) => mockGetOptions(...args),
    createOption: (...args: unknown[]) => mockCreateOption(...args),
    updateOption: (...args: unknown[]) => mockUpdateOption(...args),
    deleteOption: (...args: unknown[]) => mockDeleteOption(...args),
  })),
}));

jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
  }),
}));

describe('PlayerCustomFieldOptionsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOptions.mockResolvedValue({
      data: [
        {
          id_player_custom_field_option: 1,
          player_custom_field_id: 5,
          code: 'yes',
          label: 'Yes',
          sort_order: 0,
          is_active: true,
          inserted_at: 1,
        },
      ],
    });
    mockCreateOption.mockResolvedValue({ data: {} });
    mockUpdateOption.mockResolvedValue({ data: {} });
    mockDeleteOption.mockResolvedValue(undefined);
  });

  it('loads and lists options', async () => {
    const { getByTestId, getByText } = render(
      <PlayerCustomFieldOptionsPanel fieldId={5} />
    );

    await waitFor(() =>
      expect(getByTestId('custom-field-option-1')).toBeTruthy()
    );
    expect(mockGetOptions).toHaveBeenCalledWith(5);
    expect(getByText('Yes')).toBeTruthy();
  });

  it('creates a new option', async () => {
    const { getByTestId } = render(
      <PlayerCustomFieldOptionsPanel fieldId={5} />
    );

    await waitFor(() =>
      expect(getByTestId('custom-field-option-add')).toBeTruthy()
    );

    fireEvent.changeText(getByTestId('custom-field-option-new-label'), 'Maybe');
    fireEvent.press(getByTestId('custom-field-option-add'));

    await waitFor(() =>
      expect(mockCreateOption).toHaveBeenCalledWith(5, { label: 'Maybe' })
    );
  });

  it('toggles option active state', async () => {
    const { getByTestId } = render(
      <PlayerCustomFieldOptionsPanel fieldId={5} />
    );

    await waitFor(() =>
      expect(getByTestId('custom-field-option-active-1')).toBeTruthy()
    );

    fireEvent(getByTestId('custom-field-option-active-1'), 'valueChange', false);

    await waitFor(() =>
      expect(mockUpdateOption).toHaveBeenCalledWith(5, 1, {
        label: 'Yes',
        sort_order: 0,
        is_active: false,
      })
    );
  });
});
