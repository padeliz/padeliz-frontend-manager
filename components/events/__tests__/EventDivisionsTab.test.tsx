import EventDivisionsTab from '@/components/events/EventDivisionsTab';
import {
  PageChromeProvider,
  usePageChrome,
} from '@/components/chrome/PageChromeProvider';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createTestQueryClient,
} from '@/testing/createTestQueryClient';
import React from 'react';
import { Pressable } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockCreate = jest.fn(async (..._args: unknown[]) => ({ data: {} }));
const mockDelete = jest.fn(async (..._args: unknown[]) => undefined);
const mockReorder = jest.fn(async (..._args: unknown[]) => ({
  data: [] as unknown[],
}));
const mockPush = jest.fn();

jest.mock('@/services/api/eventDivisionsApi', () => ({
  EventDivisionsApiService: jest.fn().mockImplementation(() => ({
    createEventDivision: (...args: unknown[]) => mockCreate(...args),
    deleteEventDivision: (...args: unknown[]) => mockDelete(...args),
    reorderEventDivisions: (...args: unknown[]) => mockReorder(...args),
  })),
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  useRouter: () => ({ push: (...args: unknown[]) => mockPush(...args) }),
})
);

jest.mock('@/components/ui/SingleSelectDropdown', () => {
  const { Pressable, Text, View } = require('react-native');
  return ({ options, selectedValue, onSelectionChange, title }: any) => (
    <View>
      <Text testID={`dropdown-${title}-selected`}>{String(selectedValue)}</Text>
      {options?.map((o: any) => (
        <Pressable
          key={String(o.value)}
          testID={`dropdown-${title}-option-${o.value}`}
          onPress={() => onSelectionChange(o.value)}
        >
          <Text>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
});

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: any) => c },
    View,
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withSpring: (v: any) => v,
    runOnJS: (fn: any) => fn,
  };
});

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: View,
    GestureDetector: ({ children }: any) => children,
    Gesture: {
      Pan: () => ({
        enabled: () => ({
          activeOffsetY: () => ({
            onStart: () => ({
              onUpdate: () => ({
                onEnd: () => ({ onFinalize: () => ({}) }),
              }),
            }),
          }),
        }),
      }),
    },
  };
});

import { productDateTimeToDate } from '@/utils/productDateTime';

const day = '2026-08-24';
const unixAt = (time: string) =>
  Math.floor(productDateTimeToDate(day, time).getTime() / 1000);

const divisions = [
  {
    id_event_division: 9,
    event_id: 1,
    division_id: 2,
    division_title: 'Rookies',
    players_limit: 16,
    skill_order: 0,
    playing_starts_at: unixAt('10:00:00'),
    playing_ends_at: unixAt('14:00:00'),
    inserted_at: 1,
  },
  {
    id_event_division: 10,
    event_id: 1,
    division_id: 3,
    division_title: 'Open',
    players_limit: 12,
    skill_order: 1,
    playing_starts_at: unixAt('14:00:00'),
    playing_ends_at: unixAt('18:00:00'),
    inserted_at: 1,
  },
] as any;

const catalog = [
  { id_division: 2, name: 'Rookies', color: '#FACC15', level_min: '5.99', level_max: '5.00' },
  { id_division: 3, name: 'Open', color: '#22C55E', level_min: '3.99', level_max: '3.00' },
  { id_division: 4, name: 'Kids', color: '#38BDF8', level_min: '4.99', level_max: '4.67' },
] as any;

/** Fill required schedule/fee fields that no longer have defaults. */
function fillRequiredCreateFields(
  getByTestId: (id: string) => any,
  overrides: { players?: string; start?: string; end?: string; fee?: string } = {}
) {
  fireEvent.changeText(
    getByTestId('divisions-players-limit-input'),
    overrides.players ?? '16'
  );
  fireEvent.changeText(
    getByTestId('divisions-start-input'),
    overrides.start ?? `${day}T10:00`
  );
  fireEvent.changeText(
    getByTestId('divisions-end-input'),
    overrides.end ?? `${day}T18:00`
  );
  fireEvent.changeText(
    getByTestId('divisions-entry-fee-input'),
    overrides.fee ?? '55'
  );
}

function ChromeSaveProbe() {
  const { actions } = usePageChrome();
  return (
    <Pressable testID="chrome-save" onPress={() => void actions?.save?.()} />
  );
}

function renderTab(props: Partial<React.ComponentProps<typeof EventDivisionsTab>> = {}) {
  const client = createTestQueryClient();
  const onRefresh = jest.fn(async () => undefined);
  const utils = render(
    <QueryClientProvider client={client}>
      <PageChromeProvider>
        <ChromeSaveProbe />
        <EventDivisionsTab
          eventId={1}
          eventFinalized={false}
          divisions={divisions}
          catalogDivisions={catalog}
          onRefresh={onRefresh}
          {...props}
        />
      </PageChromeProvider>
    </QueryClientProvider>
  );
  return { ...utils, onRefresh };
}

describe('EventDivisionsTab', () => {
  const originalOpen = (global as any).window?.open;

  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).confirm = jest.fn(() => true);
    (window as any).open = jest.fn();
  });

  afterAll(() => {
    (window as any).open = originalOpen;
  });

  it('lists divisions ordered by skill_order with playing window and limit', () => {
    const { getByTestId } = renderTab({
      divisions: [divisions[1], divisions[0]],
    });
    expect(getByTestId('division-row-9')).toBeTruthy();
    expect(getByTestId('division-meta-9')).toHaveTextContent(
      'limit 16 · 10:00 – 14:00 · skill_order 0'
    );
    expect(getByTestId('division-row-10')).toBeTruthy();
  });

  it('creates a division prefilling title and levels from the catalog', async () => {
    const { getByTestId, onRefresh } = renderTab();

    fillRequiredCreateFields(getByTestId);
    fireEvent.press(getByTestId('dropdown-Division-option-4'));
    fireEvent.press(getByTestId('divisions-add-button'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        event_id: 1,
        division_id: 4,
        division_title: 'Kids',
        players_limit: 16,
        playing_starts_at: unixAt('10:00:00'),
        playing_ends_at: unixAt('18:00:00'),
        entry_fee: 55,
        level_min: '4.99',
        level_max: '4.67',
      });
    });
    expect(onRefresh).toHaveBeenCalled();
  });

  it('preserves players limit, times, and entry fee after a successful create', async () => {
    const { getByTestId } = renderTab();

    fillRequiredCreateFields(getByTestId, {
      players: '8',
      start: `${day}T11:00`,
      end: `${day}T15:00`,
      fee: '60',
    });
    fireEvent.press(getByTestId('dropdown-Division-option-4'));
    fireEvent.press(getByTestId('divisions-add-button'));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));

    expect(getByTestId('divisions-players-limit-input').props.value).toBe('8');
    expect(getByTestId('divisions-start-input').props.value).toBe(`${day}T11:00`);
    expect(getByTestId('divisions-end-input').props.value).toBe(`${day}T15:00`);
    expect(getByTestId('divisions-entry-fee-input').props.value).toBe('60');
    expect(getByTestId('divisions-title-input').props.value).toBe('');
    expect(getByTestId('divisions-level-min-input').props.value).toBe('');
    expect(getByTestId('divisions-level-max-input').props.value).toBe('');
  });

  it('creates a division with overridden level_min / level_max bounds', async () => {
    const { getByTestId } = renderTab();

    fillRequiredCreateFields(getByTestId);
    fireEvent.press(getByTestId('dropdown-Division-option-4'));
    fireEvent.changeText(getByTestId('divisions-level-min-input'), '4.50');
    fireEvent.changeText(getByTestId('divisions-level-max-input'), ' 4.10 ');
    fireEvent.press(getByTestId('divisions-add-button'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          division_id: 4,
          entry_fee: 55,
          level_min: '4.50',
          level_max: '4.10',
        })
      );
    });
  });

  it('omits bounds from the payload when cleared after catalog pick', async () => {
    const { getByTestId } = renderTab();
    fillRequiredCreateFields(getByTestId);
    fireEvent.press(getByTestId('dropdown-Division-option-4'));
    fireEvent.changeText(getByTestId('divisions-level-min-input'), '');
    fireEvent.changeText(getByTestId('divisions-level-max-input'), '');
    fireEvent.press(getByTestId('divisions-add-button'));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    const payload = mockCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('level_min');
    expect(payload).not.toHaveProperty('level_max');
    expect(payload.entry_fee).toBe(55);
  });

  it('shows stored bounds in the row meta', () => {
    const { getByTestId } = renderTab({
      divisions: [
        { ...divisions[0], level_min: '4.99', level_max: '4.67' },
        divisions[1],
      ],
    });
    expect(getByTestId('division-meta-9')).toHaveTextContent(
      'limit 16 · 10:00 – 14:00 · skill_order 0 · level 4.99 → 4.67'
    );
    expect(getByTestId('division-meta-10')).toHaveTextContent(
      'limit 12 · 14:00 – 18:00 · skill_order 1'
    );
  });

  it('keeps an edited title instead of the catalog name', async () => {
    const { getByTestId } = renderTab();

    fireEvent.changeText(getByTestId('divisions-title-input'), 'Kids Cup');
    fireEvent.press(getByTestId('dropdown-Division-option-4'));
    fillRequiredCreateFields(getByTestId, { players: '8' });
    fireEvent.press(getByTestId('divisions-add-button'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          division_title: 'Kids Cup',
          players_limit: 8,
          entry_fee: 55,
        })
      );
    });
  });

  it('keeps catalog divisions selectable even when already used by the event', () => {
    const { getByTestId } = renderTab();
    expect(getByTestId('dropdown-Division-option-2')).toBeTruthy();
    expect(getByTestId('dropdown-Division-option-3')).toBeTruthy();
    expect(getByTestId('dropdown-Division-option-4')).toBeTruthy();
  });

  it('deletes after confirmation and holds the success state on the icon button', async () => {
    const { getByTestId, findByTestId, onRefresh } = renderTab();
    fireEvent.press(getByTestId('division-delete-10'));
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(10);
    });
    expect(onRefresh).toHaveBeenCalled();
    expect(await findByTestId('division-delete-10-success')).toBeTruthy();
  });

  it('skips the delete request when the confirm is cancelled', () => {
    (window as any).confirm = jest.fn(() => false);
    const { getByTestId, queryByTestId } = renderTab();
    fireEvent.press(getByTestId('division-delete-10'));
    expect(mockDelete).not.toHaveBeenCalled();
    expect(queryByTestId('division-delete-10-pending')).toBeNull();
  });

  it('surfaces delete failures on the icon button', async () => {
    mockDelete.mockRejectedValueOnce(new Error('division in use'));
    const { getByTestId, findByTestId } = renderTab();
    fireEvent.press(getByTestId('division-delete-10'));
    expect(await findByTestId('division-delete-10-error')).toBeTruthy();
  });

  it('reorders with arrows and saves skill_order via PATCH reorder', async () => {
    const { getByTestId } = renderTab();

    fireEvent.press(getByTestId('division-move-down-9'));
    fireEvent.press(getByTestId('chrome-save'));

    await waitFor(() => {
      expect(mockReorder).toHaveBeenCalledWith(1, [
        { id_event_division: 10, skill_order: 0 },
        { id_event_division: 9, skill_order: 1 },
      ]);
    });
  });

  it('does not save when the order is unchanged', async () => {
    const { getByTestId } = renderTab();
    fireEvent.press(getByTestId('chrome-save'));
    await waitFor(() => {
      expect(mockReorder).not.toHaveBeenCalled();
    });
  });

  it('opens the event division resource page in a new window', () => {
    const { getByTestId } = renderTab();
    fireEvent.press(getByTestId('division-edit-9'));
    expect(window.open).toHaveBeenCalledWith(
      '/event-divisions/9',
      '_blank',
      'noopener,noreferrer'
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('disables mutations when the event is finalized', () => {
    const { getByTestId, queryByTestId } = renderTab({
      eventFinalized: true,
    });
    expect(getByTestId('divisions-finalized-hint')).toBeTruthy();
    expect(queryByTestId('divisions-add-form')).toBeNull();
    expect(queryByTestId('division-delete-9')).toBeNull();
    expect(queryByTestId('division-move-down-9')).toBeNull();
    expect(queryByTestId('division-drag-handle-9')).toBeNull();
    expect(getByTestId('division-edit-9')).toBeTruthy();
  });

  it('surfaces API failures on the Add button instead of an error banner', async () => {
    mockCreate.mockRejectedValueOnce(new Error('duplicate division'));
    const { getByTestId, findByTestId, queryByTestId } = renderTab();
    fillRequiredCreateFields(getByTestId);
    fireEvent.press(getByTestId('dropdown-Division-option-4'));
    fireEvent.press(getByTestId('divisions-add-button'));
    expect(await findByTestId('divisions-add-button-error')).toBeTruthy();
    expect(queryByTestId('divisions-error')).toBeNull();
  });

  it('requires entry fee before create', async () => {
    const { getByTestId, findByTestId } = renderTab();
    fillRequiredCreateFields(getByTestId, { fee: '' });
    fireEvent.press(getByTestId('dropdown-Division-option-4'));
    fireEvent.press(getByTestId('divisions-add-button'));
    expect(await findByTestId('divisions-add-button-error')).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('fails validation inside run when no catalog division is picked', async () => {
    const { getByTestId, findByTestId } = renderTab();
    fireEvent.press(getByTestId('divisions-add-button'));
    expect(await findByTestId('divisions-add-button-error')).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('wires mutations through ActionButton without press-tied error state', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'EventDivisionsTab.tsx'),
      'utf8'
    );
    expect(src).toContain(
      "import { useActionButtonStatus } from '@/hooks/useActionButtonStatus'"
    );
    expect(src).toContain(
      "import { confirmAction } from '@/utils/confirmAction'"
    );
    expect(src).toContain('auditoryFeedback: true');
    expect(src).toContain('successHoldMs: 4000');
    expect(src).toContain('iconOnly');
    expect(src).toContain('confirmAction(');
    expect(src).not.toContain('divisions-error');
    expect(src).not.toContain('setError');
    expect(src).not.toContain('Alert.alert');
  });
});
