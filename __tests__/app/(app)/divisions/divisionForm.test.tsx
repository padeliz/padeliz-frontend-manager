/**
 * @jest-environment jsdom
 */
import AddDivisionPage from '@/app/(app)/divisions/add';
import ViewDivisionPage from '@/app/(app)/divisions/[id]';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockCreateDivision = jest.fn();
const mockGetDivision = jest.fn();
const mockUpdateDivision = jest.fn();
const mockSyncLevels = jest.fn();
const mockGetAllLevels = jest.fn();
const mockReplace = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('@/lib/actionButtonFeedback', () => ({
  playSuccess: jest.fn(async () => undefined),
  playError: jest.fn(async () => undefined),
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
    useRouter: () => ({ replace: mockReplace, back: jest.fn(), push: jest.fn() }),
    useLocalSearchParams: () => ({ id: '5' }),
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

jest.mock('@/services/api/divisionsApi', () => ({
  DivisionsApiService: jest.fn().mockImplementation(() => ({
    createDivision: (...args: unknown[]) => mockCreateDivision(...args),
    getDivision: (...args: unknown[]) => mockGetDivision(...args),
    updateDivision: (...args: unknown[]) => mockUpdateDivision(...args),
    syncDivisionLevels: (...args: unknown[]) => mockSyncLevels(...args),
  })),
}));

jest.mock('@/services/api/levelsApi', () => ({
  LevelsApiService: jest.fn().mockImplementation(() => ({
    getAllLevels: (...args: unknown[]) => mockGetAllLevels(...args),
  })),
}));

const divisionMetadata = {
  version: '1.0.0',
  schema_name: 'Division',
  resource_path: 'divisions',
  display_field: 'name',
  searchable_fields: ['name'],
  filterable_fields: {},
  sortable_fields: ['name'],
  request_body: {},
  swagger_schema: {
    required: ['name'],
    properties: {
      id_division: { type: 'integer', format: 'int64', readOnly: true },
      name: { type: 'string', title: 'Name' },
      level_min: { type: 'string', title: 'Level Min', nullable: true },
      level_max: { type: 'string', title: 'Level Max', nullable: true },
    },
  },
};

jest.mock('@/hooks/useResourceMetadata', () => ({
  useResourceMetadata: () => ({
    getMetadata: () => divisionMetadata,
    getError: () => null,
    isLoading: () => false,
    fetchMetadata: jest.fn(),
  }),
}));

const bands = [
  { id_level: 1, name: 'Div 3 Mid', level_min: '3.66', level_max: '3.34' },
  { id_level: 2, name: 'Div 3 Top', level_min: '3.33', level_max: '3.01' },
];

describe('Division form: bands (M2M) + independent bounds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllLevels.mockResolvedValue(bands);
  });

  it('create sends level_ids and the typed bounds without deriving them from bands', async () => {
    mockCreateDivision.mockResolvedValue({ data: { id_division: 9 } });
    const { findByTestId, getByTestId, getByDisplayValue, getByPlaceholderText } =
      render(<AddDivisionPage />);

    // Bands picker is part of the create form.
    fireEvent.press(await findByTestId('division-band-1'));
    fireEvent.press(getByTestId('division-band-2'));

    // Bounds are plain, editable fields (typed after the bands were picked).
    const levelMinInput = getByPlaceholderText('Enter level_min');
    const levelMaxInput = getByPlaceholderText('Enter level_max');
    fireEvent.changeText(getByPlaceholderText('Enter name'), 'Advanced');
    fireEvent.changeText(levelMinInput, '4.99');
    fireEvent.changeText(levelMaxInput, '4.67');

    // Toggling bands afterwards must not rewrite the bounds.
    fireEvent.press(getByTestId('division-band-2'));
    expect(getByDisplayValue('4.99')).toBeTruthy();
    expect(getByDisplayValue('4.67')).toBeTruthy();

    fireEvent.press(getByTestId('resource-create-save'));

    await waitFor(() => expect(mockCreateDivision).toHaveBeenCalledTimes(1));
    expect(mockCreateDivision.mock.calls[0][0]).toMatchObject({
      name: 'Advanced',
      level_min: '4.99',
      level_max: '4.67',
      level_ids: [1],
    });
  });

  it('create leaves bounds out when the manager never typed them', async () => {
    mockCreateDivision.mockResolvedValue({ data: { id_division: 9 } });
    const { findByTestId, getByTestId, getByPlaceholderText } = render(
      <AddDivisionPage />
    );
    fireEvent.press(await findByTestId('division-band-1'));
    fireEvent.changeText(getByPlaceholderText('Enter name'), 'Rookies');
    fireEvent.press(getByTestId('resource-create-save'));

    await waitFor(() => expect(mockCreateDivision).toHaveBeenCalledTimes(1));
    const payload = mockCreateDivision.mock.calls[0][0];
    expect(payload.level_ids).toEqual([1]);
    expect(payload.level_min ?? null).toBeNull();
    expect(payload.level_max ?? null).toBeNull();
  });

  it('view: saving bounds sends level_min/level_max but not level_ids', async () => {
    const division = {
      id_division: 5,
      name: 'Advanced',
      level_min: '4.99',
      level_max: '4.67',
      levels: [bands[0]],
    };
    mockGetDivision.mockResolvedValue({ data: division });
    mockUpdateDivision.mockResolvedValue({
      data: { ...division, level_min: '5.10' },
    });

    const { findByText, getByText, getByTestId, findByDisplayValue } = render(
      <ViewDivisionPage />
    );
    fireEvent.press(await findByText('Edit'));
    const minInput = await findByDisplayValue('4.99');
    fireEvent.changeText(minInput, '5.10');
    await waitFor(() => expect(getByText('Save')).toBeTruthy());
    fireEvent.press(getByText('Save'));

    await waitFor(() => expect(mockUpdateDivision).toHaveBeenCalledTimes(1));
    const [id, payload] = mockUpdateDivision.mock.calls[0];
    expect(id).toBe(5);
    expect(payload.level_min).toBe('5.10');
    expect(payload.level_max).toBe('4.67');
    expect(payload).not.toHaveProperty('level_ids');
    // Bands are untouched by a bounds save.
    expect(mockSyncLevels).not.toHaveBeenCalled();
    expect(getByTestId('division-level-bands-section')).toBeTruthy();
  });

  it('view: changing bands does not rewrite bounds and saves independently', async () => {
    const division = {
      id_division: 5,
      name: 'Advanced',
      level_min: '4.99',
      level_max: '4.67',
      levels: [bands[0]],
    };
    mockGetDivision.mockResolvedValue({ data: division });
    mockSyncLevels.mockResolvedValue({
      data: { ...division, levels: [bands[0], bands[1]] },
    });

    const { findByTestId, getByTestId, getByText } = render(
      <ViewDivisionPage />
    );
    expect(
      (await findByTestId('division-band-1')).props.accessibilityState.checked
    ).toBe(true);
    fireEvent.press(getByTestId('division-band-2'));
    fireEvent.press(getByTestId('division-level-bands-save'));

    await waitFor(() => expect(mockSyncLevels).toHaveBeenCalledWith(5, [1, 2]));
    expect(mockUpdateDivision).not.toHaveBeenCalled();
    // The displayed bounds are still the stored ones.
    expect(getByText('4.99')).toBeTruthy();
    expect(getByText('4.67')).toBeTruthy();
  });
});
