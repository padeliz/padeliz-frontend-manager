import FormFieldSelector from '@/components/ui/FormFieldSelector';
import { render, screen } from '@testing-library/react-native';
import React from 'react';

const mockUseUserPicker = jest.fn(() => ({
  options: [{ value: 7, label: 'Ada Lovelace' }],
  onSearch: jest.fn(),
  loading: false,
}));

jest.mock('@/hooks/useUserPicker', () => ({
  useUserPicker: (...args: unknown[]) => mockUseUserPicker(...args),
}));

jest.mock('@/utils/foreignKeyService', () => ({
  ForeignKeyService: {
    getLinkedResourceInfo: jest.fn(() => ({
      resourceName: 'clubs',
      displayField: 'name',
      fetchOptions: jest.fn(async () => [{ id: 1, label: 'Club A' }]),
    })),
  },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

const baseMetadata = {
  version: 'v1',
  schema_name: 'PlayerInvite',
  resource_path: 'player-invites',
  searchable_fields: [],
  sortable_fields: [],
  request_body: {},
  swagger_schema: { required: [], properties: {} },
  filterable_fields: {
    player_user_id: {
      type: 'foreign_key' as const,
      related_schema_name: 'User',
      related_schema_field: 'name',
      related_user_role: 'player' as const,
    },
    created_by_manager_user_id: {
      type: 'foreign_key' as const,
      related_schema_name: 'User',
      related_schema_field: 'name',
      related_user_role: 'manager' as const,
    },
    club_id: {
      type: 'foreign_key' as const,
      related_schema_name: 'Club',
      related_schema_field: 'name',
    },
  },
};

describe('FormFieldSelector User FK path', () => {
  beforeEach(() => {
    mockUseUserPicker.mockClear();
  });

  it('renders searchable User FK via useUserPicker with metadata role', () => {
    render(
      <FormFieldSelector
        fieldKey="created_by_manager_user_id"
        fieldValue={7}
        metadata={baseMetadata}
        onChange={jest.fn()}
      />
    );

    expect(
      screen.getByTestId('user-fk-selector-created_by_manager_user_id')
    ).toBeTruthy();
    expect(mockUseUserPicker).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'manager', selectedValue: 7 })
    );
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
  });

  it('falls back to field-key manager vs player when related_user_role missing', () => {
    const metadata = {
      ...baseMetadata,
      filterable_fields: {
        reviewed_by_manager_user_id: {
          type: 'foreign_key' as const,
          related_schema_name: 'User',
          related_schema_field: 'name',
        },
      },
    };

    render(
      <FormFieldSelector
        fieldKey="reviewed_by_manager_user_id"
        fieldValue={null}
        metadata={metadata}
        onChange={jest.fn()}
      />
    );

    expect(mockUseUserPicker).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'manager' })
    );
  });

  it('keeps non-User FK on static ForeignKeyService path', async () => {
    render(
      <FormFieldSelector
        fieldKey="club_id"
        fieldValue={1}
        metadata={baseMetadata}
        onChange={jest.fn()}
      />
    );

    expect(await screen.findByText('Club A')).toBeTruthy();
    expect(mockUseUserPicker).not.toHaveBeenCalled();
    expect(screen.queryByTestId(/user-fk-selector/)).toBeNull();
  });
});
