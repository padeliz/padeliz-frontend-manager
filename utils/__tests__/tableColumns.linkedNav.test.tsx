/**
 * @jest-environment jsdom
 */
import { generateColumnsFromMetadata } from '../tableColumns';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  useRouter: () => ({ push: mockPush }),
})
);

describe('linked FK cell navigation', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('navigates to linked resource_path on press', () => {
    const clubMeta: any = {
      schema_name: 'Club',
      resource_path: 'clubs',
      display_field: 'name',
      swagger_schema: {
        required: [],
        properties: {
          id_club: { type: 'integer', format: 'int64', readOnly: true },
          name: { type: 'string' },
          location_id: { type: 'integer', format: 'int64', title: 'Location' },
          location: {
            oneOf: [{ $ref: '#/components/schemas/Location' }],
          },
        },
      },
      filterable_fields: {
        location_id: {
          type: 'foreign_key',
          related_schema_name: 'Location',
          related_schema_field: 'name',
        },
      },
      searchable_fields: [],
      sortable_fields: ['location_id'],
    };

    const locationMeta: any = {
      schema_name: 'Location',
      resource_path: 'locations',
      display_field: 'name',
      swagger_schema: {
        required: [],
        properties: {
          id_location: {
            type: 'integer',
            format: 'int64',
            readOnly: true,
            description: 'Primary Identifier',
          },
          name: { type: 'string' },
        },
      },
      filterable_fields: {},
      searchable_fields: ['name'],
      sortable_fields: [],
    };

    const cols = generateColumnsFromMetadata(clubMeta, {
      linkedResourcesMetadata: { Location: locationMeta },
    });
    const locationCol = cols.find(c => c.key === 'location');
    expect(locationCol?.render).toBeDefined();

    const node = locationCol!.render!({
      id_club: 1,
      location_id: 5,
      location: { id_location: 5, name: 'Central Courts' },
    });

    const { getByText } = render(<>{node}</>);
    fireEvent.press(getByText('Central Courts'));
    expect(mockPush).toHaveBeenCalledWith('/locations/5');
  });
});
