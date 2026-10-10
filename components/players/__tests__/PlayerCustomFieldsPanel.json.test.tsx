/**
 * @jest-environment jsdom
 */
import PlayerCustomFieldsPanel from '@/components/players/PlayerCustomFieldsPanel';
import { createTestQueryClient } from '@/testing/createTestQueryClient';
import { QueryClientProvider } from '@tanstack/react-query';
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

jest.mock('@/lib/actionButtonFeedback', () => ({
  playSuccess: jest.fn(async () => undefined),
  playError: jest.fn(async () => undefined),
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

function renderPanel() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <PlayerCustomFieldsPanel playerId={42} />
    </QueryClientProvider>
  );
}

const racketField = {
  id_player_custom_field: 20,
  code: 'racket_experience',
  label: 'Racket experience',
  type: 'json',
  sort_order: 0,
  is_required: false,
  inserted_at: 1,
  rules_json: { sports: ['Padel', 'Tennis'], levels: ['Beginner', 'Advanced'] },
};

const genericJsonField = {
  id_player_custom_field: 21,
  code: 'extra',
  label: 'Extra',
  type: 'json',
  sort_order: 1,
  is_required: false,
  inserted_at: 1,
};

describe('PlayerCustomFieldsPanel json custom fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFields.mockResolvedValue({ data: [racketField, genericJsonField] });
    mockGetEvents.mockResolvedValue({ data: [] });
    mockGetValues.mockResolvedValue({ data: [], meta: { last_page: 1 } });
    mockCreateValue.mockResolvedValue({ data: {}, message: 'ok' });
  });

  it('displays racket_experience history as readable lines', async () => {
    mockGetValues.mockResolvedValue({
      data: [
        {
          id_player_custom_field_value: 50,
          player_id: 42,
          player_custom_field_id: 20,
          value_json: [
            {
              sport: 'Padel',
              level: 'Beginner',
              years_of_playing: 2,
              matches_played: 10,
            },
            { sport: 'Tennis', level: 'Advanced', lessons_had: 5 },
          ],
          value: [
            { sport: 'Padel', level: 'Beginner', years_of_playing: 2 },
          ],
          submitted_via: 'manager',
          inserted_at: 1700000000,
          field: racketField,
        },
      ],
      meta: { last_page: 1 },
    });
    const { findByTestId, getByText, queryByText } = renderPanel();
    await findByTestId('custom-field-value-row-50');
    expect(
      getByText(
        'Value: Padel · Beginner · 2 years · 10 matches\nTennis · Advanced · 5 lessons'
      )
    ).toBeTruthy();
    expect(queryByText(/\[object Object\]/)).toBeNull();
  });

  it('displays other json values as compact JSON', async () => {
    mockGetValues.mockResolvedValue({
      data: [
        {
          id_player_custom_field_value: 51,
          player_id: 42,
          player_custom_field_id: 21,
          value_json: { a: 1 },
          value: { a: 1 },
          submitted_via: 'manager',
          inserted_at: 1700000000,
          field: genericJsonField,
        },
      ],
      meta: { last_page: 1 },
    });
    const { findByTestId, getByText } = renderPanel();
    await findByTestId('custom-field-value-row-51');
    expect(getByText('Value: {"a":1}')).toBeTruthy();
  });

  it('edits racket_experience with the structured editor and submits an array', async () => {
    const { findByTestId, getByTestId } = renderPanel();
    fireEvent.press(await findByTestId('dropdown-option-20'));

    expect(getByTestId('custom-field-value-racket-experience')).toBeTruthy();
    fireEvent.press(getByTestId('dropdown-option-Padel'));
    fireEvent.press(getByTestId('dropdown-option-Beginner'));
    fireEvent.changeText(getByTestId('racket-years_of_playing-0'), '2.5');
    fireEvent.changeText(getByTestId('racket-matches_played-0'), '10');
    fireEvent.press(getByTestId('custom-field-submit'));

    await waitFor(() =>
      expect(mockCreateValue).toHaveBeenCalledWith(42, {
        player_custom_field_id: 20,
        event_id: null,
        value: [
          {
            sport: 'Padel',
            level: 'Beginner',
            years_of_playing: 2.5,
            matches_played: 10,
          },
        ],
      })
    );
  });

  it('adds and removes sport entries', async () => {
    const { findByTestId, getByTestId, queryByTestId } = renderPanel();
    fireEvent.press(await findByTestId('dropdown-option-20'));
    expect(queryByTestId('racket-entry-1')).toBeNull();
    fireEvent.press(getByTestId('racket-add-entry'));
    expect(getByTestId('racket-entry-1')).toBeTruthy();
    fireEvent.press(getByTestId('racket-remove-1'));
    expect(queryByTestId('racket-entry-1')).toBeNull();
  });

  it('blocks an incomplete racket entry with a specific validation message', async () => {
    const { findByTestId, getByTestId } = renderPanel();
    fireEvent.press(await findByTestId('dropdown-option-20'));
    fireEvent.press(getByTestId('dropdown-option-Padel'));
    fireEvent.press(getByTestId('dropdown-option-Beginner'));
    await act(async () => {
      fireEvent.press(getByTestId('custom-field-submit'));
    });

    expect(await findByTestId('custom-field-submit-error')).toBeTruthy();
    expect(mockCreateValue).not.toHaveBeenCalled();
    expect(mockShowError).toHaveBeenCalledWith(
      'Validation',
      expect.stringMatching(/years of playing/)
    );
  });

  it('edits a generic json field as JSON text and submits the parsed value', async () => {
    const { findByTestId, getByTestId } = renderPanel();
    fireEvent.press(await findByTestId('dropdown-option-21'));
    fireEvent.changeText(getByTestId('custom-field-value-json'), '{"a": 1}');
    fireEvent.press(getByTestId('custom-field-submit'));

    await waitFor(() =>
      expect(mockCreateValue).toHaveBeenCalledWith(42, {
        player_custom_field_id: 21,
        event_id: null,
        value: { a: 1 },
      })
    );
  });

  it('rejects invalid JSON text before calling the API', async () => {
    const { findByTestId, getByTestId } = renderPanel();
    fireEvent.press(await findByTestId('dropdown-option-21'));
    fireEvent.changeText(getByTestId('custom-field-value-json'), '{oops');
    await act(async () => {
      fireEvent.press(getByTestId('custom-field-submit'));
    });
    expect(await findByTestId('custom-field-submit-error')).toBeTruthy();
    expect(mockCreateValue).not.toHaveBeenCalled();
    expect(mockShowError).toHaveBeenCalledWith('Validation', 'Value must be valid JSON.');
  });
});
