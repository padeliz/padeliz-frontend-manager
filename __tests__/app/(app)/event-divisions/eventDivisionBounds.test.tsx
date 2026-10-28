/**
 * @jest-environment jsdom
 */
import ViewEventDivisionPage from '@/app/(app)/event-divisions/[id]';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockGetEventDivision = jest.fn();
const mockUpdateEventDivision = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('@/lib/actionButtonFeedback', () => ({
  playSuccess: jest.fn(async () => undefined),
  playError: jest.fn(async () => undefined),
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
    useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
    useLocalSearchParams: () => ({ id: '9' }),
  })
);

jest.mock('@/components/layout/AppLayout', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, headerActions }: any) => (
      <View>
        {headerActions}
        {children}
      </View>
    ),
  };
});

jest.mock('@/utils/linkedEntityService', () => ({
  LinkedEntityService: { detectLinkedEntities: jest.fn(async () => []) },
}));

jest.mock('@/services/api/eventDivisionsApi', () => ({
  EventDivisionsApiService: jest.fn().mockImplementation(() => ({
    getEventDivision: (...args: unknown[]) => mockGetEventDivision(...args),
    updateEventDivision: (...args: unknown[]) =>
      mockUpdateEventDivision(...args),
  })),
}));

const eventDivisionMetadata = {
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
      id_event_division: { type: 'integer', format: 'int64', readOnly: true },
      division_title: { type: 'string', title: 'Title' },
      level_min: { type: 'string', title: 'Level Min', nullable: true },
      level_max: { type: 'string', title: 'Level Max', nullable: true },
    },
  },
};

jest.mock('@/hooks/useResourceMetadata', () => ({
  useResourceMetadata: () => ({
    getMetadata: () => eventDivisionMetadata,
    getError: () => null,
    isLoading: () => false,
    fetchMetadata: jest.fn(),
  }),
}));

describe('Event division bounds fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const ed = {
      id_event_division: 9,
      division_title: 'Advanced',
      level_min: '4.99',
      level_max: '4.67',
    };
    mockGetEventDivision.mockResolvedValue({ data: ed });
    mockUpdateEventDivision.mockResolvedValue({
      data: { ...ed, level_min: '5.10', level_max: '4.50' },
    });
  });

  it('edits level_min / level_max and saves them with the event division', async () => {
    const { findByText, findByDisplayValue, getByDisplayValue, getByText } =
      render(<ViewEventDivisionPage />);

    fireEvent.press(await findByText('Edit'));
    fireEvent.changeText(await findByDisplayValue('4.99'), '5.10');
    fireEvent.changeText(getByDisplayValue('4.67'), '4.50');
    fireEvent.press(getByText('Save'));

    await waitFor(() => expect(mockUpdateEventDivision).toHaveBeenCalledTimes(1));
    const [id, payload] = mockUpdateEventDivision.mock.calls[0];
    expect(id).toBe(9);
    expect(payload).toMatchObject({ level_min: '5.10', level_max: '4.50' });
  });
});
