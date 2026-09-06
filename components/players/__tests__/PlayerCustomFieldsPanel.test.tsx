/**
 * @jest-environment jsdom
 */
import PlayerCustomFieldsPanel from '@/components/players/PlayerCustomFieldsPanel';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createTestQueryClient,
} from '@/testing/createTestQueryClient';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
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

const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

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
  const client = createTestQueryClient();
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
        {
          id_player_custom_field: 8,
          code: 'diet',
          label: 'Diet',
          type: 'single_select',
          sort_order: 1,
          is_required: false,
          inserted_at: 1,
          options: [
            {
              id_player_custom_field_option: 21,
              label: 'Vegan',
              is_active: true,
            },
          ],
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
    const { getByTestId, findByTestId } = renderPanel();

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
    expect(await findByTestId('custom-field-submit-success')).toBeTruthy();
    expect(mockShowSuccess).toHaveBeenCalledWith(
      'Submitted',
      'Custom field value saved'
    );
  });

  it('disables Submit with a reason until a field is picked', async () => {
    const { getByTestId } = renderPanel();

    await waitFor(() =>
      expect(getByTestId('custom-field-select')).toBeTruthy()
    );

    expect(
      getByTestId('custom-field-submit').props.accessibilityState?.disabled
    ).toBe(true);
    expect(getByTestId('custom-field-submit-info')).toBeTruthy();

    fireEvent.press(getByTestId('dropdown-option-7'));
    expect(
      getByTestId('custom-field-submit').props.accessibilityState?.disabled
    ).toBe(false);
    expect(mockCreateValue).not.toHaveBeenCalled();
  });

  it('fails validation inside run and still toasts', async () => {
    const { getByTestId, findByTestId } = renderPanel();

    await waitFor(() =>
      expect(getByTestId('custom-field-select')).toBeTruthy()
    );

    fireEvent.press(getByTestId('dropdown-option-8'));
    await act(async () => {
      fireEvent.press(getByTestId('custom-field-submit'));
    });

    expect(await findByTestId('custom-field-submit-error')).toBeTruthy();
    expect(mockCreateValue).not.toHaveBeenCalled();
    expect(mockShowError).toHaveBeenCalledWith(
      'Validation',
      'Complete the value for the selected field.'
    );
  });

  it('reports a submit API failure on the button and toasts', async () => {
    mockCreateValue.mockRejectedValueOnce(new Error('Boom'));
    const { getByTestId, findByTestId } = renderPanel();

    await waitFor(() =>
      expect(getByTestId('custom-field-select')).toBeTruthy()
    );

    fireEvent.press(getByTestId('dropdown-option-7'));
    fireEvent.changeText(getByTestId('custom-field-value-text'), 'L');
    await act(async () => {
      fireEvent.press(getByTestId('custom-field-submit'));
    });

    expect(await findByTestId('custom-field-submit-error')).toBeTruthy();
    expect(mockShowError).toHaveBeenCalledWith('Submit failed', 'Boom');
  });

  it('invalidates a value through the Confirm ActionButton', async () => {
    const { getByTestId, findByTestId } = renderPanel();

    await waitFor(() =>
      expect(getByTestId('custom-field-value-row-99')).toBeTruthy()
    );

    fireEvent.press(getByTestId('invalidate-btn-99'));
    fireEvent.changeText(getByTestId('invalidate-reason-99'), 'wrong size');
    const confirm = await findByTestId('invalidate-confirm-99');
    await act(async () => {
      fireEvent.press(confirm);
    });

    await waitFor(() =>
      expect(mockInvalidateValue).toHaveBeenCalledWith(42, 99, {
        invalidation_reason: 'wrong size',
      })
    );
    expect(mockShowSuccess).toHaveBeenCalledWith(
      'Invalidated',
      'Value marked as invalidated'
    );
  });

  it('reports an invalidate failure on the Confirm button and toasts', async () => {
    mockInvalidateValue.mockRejectedValueOnce(new Error('Nope'));
    const { getByTestId, findByTestId } = renderPanel();

    await waitFor(() =>
      expect(getByTestId('custom-field-value-row-99')).toBeTruthy()
    );

    fireEvent.press(getByTestId('invalidate-btn-99'));
    const confirm = await findByTestId('invalidate-confirm-99');
    await act(async () => {
      fireEvent.press(confirm);
    });

    expect(await findByTestId('invalidate-confirm-99-error')).toBeTruthy();
    expect(mockShowError).toHaveBeenCalledWith('Invalidate failed', 'Nope');
  });

  it('drives both mutations through ActionButton with auditory feedback', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'PlayerCustomFieldsPanel.tsx'),
      'utf8'
    );
    expect(src).toContain(
      "import ActionButton from '@/components/ui/ActionButton'"
    );
    expect(src).toContain(
      'const submitStatus = useActionButtonStatus({ auditoryFeedback: true });'
    );
    expect(src).toMatch(
      /const invalidateStatus = useActionButtonStatus\(\{[\s\S]*?auditoryFeedback: true,/
    );
    expect(src).toContain('showSuccess(');
    expect(src).toContain('showError(');
    expect(src).not.toContain('successHoldMs');
    expect(src).not.toContain('setSubmitting');
  });
});
