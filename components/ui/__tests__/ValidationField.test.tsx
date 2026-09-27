import ValidationField from '@/components/ui/ValidationField';
import { ApiResourceMetadata } from '@/types/api/metadata';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

const enumMetadata: ApiResourceMetadata = {
  version: '1.0.0',
  schema_name: 'Eligibility',
  resource_path: 'eligibilities',
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
});
