import ValidationField from '@/components/ui/ValidationField';
import { ApiResourceMetadata } from '@/types/api/metadata';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/components/ui/DateTimeFormInput', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ value }: { value: Date | null }) => (
      <Text testID="datetime-form-input-value">
        {value && !Number.isNaN(value.getTime())
          ? value.toTimeString().split(' ')[0]
          : ''}
      </Text>
    ),
  };
});

const enumMetadata: ApiResourceMetadata = {
  version: '1.0.0',
  schema_name: 'PlayerLevelAssessment',
  resource_path: 'player-level-assessments',
  display_field: 'review_status',
  searchable_fields: [],
  filterable_fields: {},
  sortable_fields: [],
  request_body: {},
  swagger_schema: {
    required: ['review_status'],
    properties: {
      review_status: {
        title: 'Review Status',
        type: 'string',
        enum: ['pending', 'approved', 'rejected', 'discarded'],
      },
    },
  },
};

describe('ValidationField', () => {
  it('opens enum select and calls onChange with the chosen value', () => {
    const onChange = jest.fn();

    const { getByText } = render(
      <ValidationField
        field={{
          name: 'review_status',
          type: 'string',
          enum: ['pending', 'approved', 'rejected', 'discarded'],
        }}
        metadata={enumMetadata}
        value="pending"
        onChange={onChange}
      />
    );

    fireEvent.press(getByText('pending'));
    fireEvent.press(getByText('approved'));

    expect(onChange).toHaveBeenCalledWith('approved');
  });

  it('does not open enum select when disabled', () => {
    const onChange = jest.fn();

    const { getByText, queryByText } = render(
      <ValidationField
        field={{
          name: 'review_status',
          type: 'string',
          enum: ['pending', 'approved', 'rejected', 'discarded'],
        }}
        metadata={enumMetadata}
        value="pending"
        onChange={onChange}
        disabled
      />
    );

    fireEvent.press(getByText('pending'));
    expect(queryByText('approved')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  const timeMetadata: ApiResourceMetadata = {
    version: '1.0.0',
    schema_name: 'EventDivision',
    resource_path: 'event-divisions',
    display_field: 'division_title',
    searchable_fields: [],
    filterable_fields: {},
    sortable_fields: [],
    request_body: {},
    swagger_schema: {
      required: [],
      properties: {
        playing_start_time: {
          title: 'Playing Start Time',
          type: 'string',
          format: 'time',
        },
      },
    },
  };

  it.each([
    ['10:00:00', '10:00:00'],
    ['10:00', '10:00:00'],
    ['16:00:00', '16:00:00'],
    ['00:00:00', '00:00:00'],
    ['23:59:59', '23:59:59'],
  ] as const)(
    'hydrates time input from API clock string %s',
    async (raw, expected) => {
      const { getByTestId } = render(
        <ValidationField
          field={{
            name: 'playing_start_time',
            type: 'string',
            format: 'time',
          }}
          metadata={timeMetadata}
          value={raw}
          onChange={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(getByTestId('datetime-form-input-value').props.children).toBe(
          expected
        );
      });
    }
  );

  it('keeps time input empty for rejected 24:00 clock strings', async () => {
    const { getByTestId } = render(
      <ValidationField
        field={{
          name: 'playing_start_time',
          type: 'string',
          format: 'time',
        }}
        metadata={timeMetadata}
        value="24:00:00"
        onChange={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(getByTestId('datetime-form-input-value').props.children).toBe('');
    });
  });

  it('keeps time input empty for null/empty values', () => {
    const { getByTestId, rerender } = render(
      <ValidationField
        field={{
          name: 'playing_start_time',
          type: 'string',
          format: 'time',
        }}
        metadata={timeMetadata}
        value={null}
        onChange={jest.fn()}
      />
    );

    expect(getByTestId('datetime-form-input-value').props.children).toBe('');

    rerender(
      <ValidationField
        field={{
          name: 'playing_start_time',
          type: 'string',
          format: 'time',
        }}
        metadata={timeMetadata}
        value=""
        onChange={jest.fn()}
      />
    );

    expect(getByTestId('datetime-form-input-value').props.children).toBe('');
  });
});
