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
const mockGetFields = jest.fn();
const mockGetEvents = jest.fn();

jest.mock('@/services/api/playerCustomFieldValuesApi', () => ({
  PlayerCustomFieldValuesApiService: jest.fn().mockImplementation(() => ({
    getValues: (...args: unknown[]) => mockGetValues(...args),
    createValue: (...args: unknown[]) => mockCreateValue(...args),
  })),
}));

jest.mock('@/services/api/playerCustomFieldsApi', () => ({
  PlayerCustomFieldsApiService: jest.fn().mockImplementation(() => ({
    getPlayerCustomFields: (...args: unknown[]) => mockGetFields(...args),
  })),
}));

jest.mock('@/services/api/eventsApi', () => ({
  EventsApiService: jest.fn().mockImplementation(() => ({
    getEvents: (...args: unknown[]) => mockGetEvents(...args),
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
    mockGetEvents.mockResolvedValue({ data: [] });
    mockGetValues.mockResolvedValue({
      data: [
        {
          id_player_custom_field_value: 99,
          player_user_id: 42,
          player_custom_field_id: 7,
          value: 'M',
          submitted_via: 'manager',
          review_status: 'validated',
          inserted_at: 1700000000,
          field: { label: 'Shirt size' },
        },
        {
          id_player_custom_field_value: 100,
          player_user_id: 42,
          player_custom_field_id: 7,
          value: 'S',
          submitted_via: 'csv',
          review_status: 'rejected',
          reviewed_at: 1700000100,
          inserted_at: 1699999000,
          field: { label: 'Shirt size' },
        },
      ],
      meta: { last_page: 1 },
    });
    mockCreateValue.mockResolvedValue({ data: {}, message: 'ok' });
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
        event_id: null,
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

  it('shows review status and marks only validated rows as current', async () => {
    const { getByTestId, queryByTestId, queryByText } = renderPanel();

    await waitFor(() =>
      expect(getByTestId('custom-field-value-row-99')).toBeTruthy()
    );
    expect(
      getByTestId('custom-field-review-status-99').props.children.join('')
    ).toContain('Validated (current)');
    const rejected = getByTestId('custom-field-review-status-100')
      .props.children.join('');
    expect(rejected).toContain('Rejected');
    expect(rejected).not.toContain('(current)');
    expect(queryByTestId('invalidate-btn-99')).toBeNull();
    expect(queryByText('Invalidate')).toBeNull();
  });

  it('drives submit through ActionButton with auditory feedback', () => {
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
    expect(src).not.toContain('invalidate');
    expect(src).toContain('showSuccess(');
    expect(src).toContain('showError(');
    expect(src).not.toContain('successHoldMs');
    expect(src).not.toContain('setSubmitting');
  });
});
