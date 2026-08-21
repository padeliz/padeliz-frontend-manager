/**
 * @jest-environment jsdom
 */
import PlayerCustomFieldsPanel from '@/components/players/PlayerCustomFieldsPanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockGetValues = jest.fn();
const mockCreateValue = jest.fn();
const mockInvalidateValue = jest.fn();
const mockGetFields = jest.fn();
const mockGetEditions = jest.fn();

jest.mock('@/services/api/playerCustomFieldValuesApi', () => ({
  PlayerCustomFieldValuesApiService: jest.fn().mockImplementation(() => ({
    getValues: (...args: unknown[]) => mockGetValues(...args),
    createValue: (...args: unknown[]) => mockCreateValue(...args),
    invalidateValue: (...args: unknown[]) => mockInvalidateValue(...args),
  })),
}));

jest.mock('@/services/api/playerCustomFieldsApi', () => ({
  PlayerCustomFieldsApiService: jest.fn().mockImplementation(() => ({
    getPlayerCustomFields: (...args: unknown[]) => mockGetFields(...args),
  })),
}));

jest.mock('@/services/api/editionsApi', () => ({
  EditionsApiService: jest.fn().mockImplementation(() => ({
    getEditions: (...args: unknown[]) => mockGetEditions(...args),
  })),
}));

jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
  }),
}));

jest.mock('@/components/ui/SingleSelectDropdown', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');
  return {
    __esModule: true,
    default: ({
      options,
      selectedValue,
      onSelectionChange,
      placeholder,
      testID,
    }: any) => (
      <View testID={testID ?? 'dropdown'}>
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
        <Pressable testID="dropdown-clear" onPress={() => onSelectionChange(null)}>
          <Text>clear</Text>
        </Pressable>
        <Text testID="dropdown-selected">{String(selectedValue ?? '')}</Text>
      </View>
    ),
  };
});

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PlayerCustomFieldsPanel playerId={42} />
    </QueryClientProvider>
  );
}

describe('PlayerCustomFieldsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFields.mockResolvedValue({
      data: [
        {
          id_player_custom_field: 7,
          code: 'shirt_size',
          label: 'Shirt size',
          type: 'text',
          sort_order: 0,
          is_required: false,
          inserted_at: 1,
        },
      ],
    });
    mockGetEditions.mockResolvedValue({ data: [] });
    mockGetValues.mockResolvedValue({
      data: [
        {
          id_player_custom_field_value: 99,
          player_id: 42,
          player_custom_field_id: 7,
          value: 'M',
          submitted_via: 'manager',
          inserted_at: 1700000000,
          field: { label: 'Shirt size' },
        },
      ],
      meta: { last_page: 1 },
    });
    mockCreateValue.mockResolvedValue({ data: {}, message: 'ok' });
    mockInvalidateValue.mockResolvedValue({ data: {}, message: 'ok' });
  });

  it('renders history rows', async () => {
    const { getByTestId, getByText } = renderPanel();

    await waitFor(() =>
      expect(getByTestId('custom-field-value-row-99')).toBeTruthy()
    );
    expect(getByText('Value: M')).toBeTruthy();
  });

  it('submits a text value', async () => {
    const { getByTestId } = renderPanel();

    await waitFor(() =>
      expect(getByTestId('custom-field-select')).toBeTruthy()
    );

    fireEvent.press(getByTestId('dropdown-option-7'));
    fireEvent.changeText(getByTestId('custom-field-value-text'), 'L');
    fireEvent.press(getByTestId('custom-field-submit'));

    await waitFor(() =>
      expect(mockCreateValue).toHaveBeenCalledWith(42, {
        player_custom_field_id: 7,
        edition_id: null,
        value: 'L',
      })
    );
  });
});
