import EventParticipationMappingButton from '@/components/events/EventParticipationMappingButton';
import {
  createTestQueryClient,
  disposeTestQueryClient,
} from '@/testing/createTestQueryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockPreview = jest.fn();
const mockMap = jest.fn();
const mockConfirmAction = jest.fn(
  (_title: string, _message: string, onConfirm: () => void) => onConfirm()
);

jest.mock('@/utils/isWebPlatform', () => ({
  isWebPlatform: () => false,
}));

jest.mock('@/services/api/eventParticipationMappingApi', () => ({
  EventParticipationMappingApiService: jest.fn().mockImplementation(() => ({
    preview: (...args: unknown[]) => mockPreview(...args),
    map: (...args: unknown[]) => mockMap(...args),
  })),
}));

jest.mock('@/components/events/eventLotteryUtils', () => ({
  confirmAction: (...args: unknown[]) => mockConfirmAction(...args),
}));

function renderButton(
  props: { eventId?: number; mutationsDisabled?: boolean } = {}
) {
  const queryClient = createTestQueryClient();
  const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <EventParticipationMappingButton
        eventId={props.eventId ?? 5}
        mutationsDisabled={props.mutationsDisabled ?? false}
      />
    </QueryClientProvider>
  );
  return { ...utils, queryClient, invalidateSpy };
}

describe('EventParticipationMappingButton', () => {
  let activeClient: ReturnType<typeof createTestQueryClient> | null = null;
  let activeUnmount: (() => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPreview.mockResolvedValue({
      data: {
        can_map: true,
        disabled_reason: null,
        existing_participations_count: 0,
        registered_player_count: 4,
        division_specific_registration_count: 2,
        event_wide_registration_count: 2,
      },
    });
    mockMap.mockResolvedValue({
      data: { created_count: 4, by_event_division: [] },
    });
  });

  afterEach(async () => {
    activeUnmount?.();
    activeUnmount = null;
    if (activeClient) {
      await disposeTestQueryClient(activeClient);
      activeClient = null;
    }
  });

  function mountButton(
    props: { eventId?: number; mutationsDisabled?: boolean } = {}
  ) {
    const mounted = renderButton(props);
    activeClient = mounted.queryClient;
    activeUnmount = mounted.unmount;
    return mounted;
  }

  it.each([
    ['finalized', 'Event is finalized — participations cannot be remapped.'],
    ['schedule_exists', 'Cannot map after a schedule has been generated.'],
    ['lottery_exists', 'Cannot map after lottery draws exist for this event.'],
    ['no_divisions', 'Add event divisions before mapping participations.'],
  ] as const)(
    'shows disabledReason tooltip for preview disabled_reason=%s',
    async (reason, hint) => {
      mockPreview.mockResolvedValue({
        data: {
          can_map: false,
          disabled_reason: reason,
          existing_participations_count: 0,
          registered_player_count: 0,
          division_specific_registration_count: 0,
          event_wide_registration_count: 0,
        },
      });

      const { findByTestId, queryByTestId } = mountButton();
      const tip = await findByTestId('map-participations-button-tooltip');
      expect(tip.props.accessibilityHint).toBe(hint);
      expect(queryByTestId('map-participations-hint')).toBeNull();
      expect(
        await findByTestId('map-participations-button-info')
      ).toBeTruthy();
    }
  );

  it('shows checking while preview loads', async () => {
    let resolvePreview!: (v: unknown) => void;
    mockPreview.mockImplementation(
      () =>
        new Promise(r => {
          resolvePreview = r;
        })
    );

    const { getByTestId, queryByTestId, findByText } = mountButton();
    expect(getByTestId('map-participations-button-checking')).toBeTruthy();

    resolvePreview({
      data: {
        can_map: true,
        disabled_reason: null,
        existing_participations_count: 0,
        registered_player_count: 1,
        division_specific_registration_count: 0,
        event_wide_registration_count: 1,
      },
    });

    await findByText('Map players to divisions');
    await waitFor(() => {
      expect(queryByTestId('map-participations-button-checking')).toBeNull();
    });
  });

  it('maps immediately when there are no existing participations', async () => {
    const { getByTestId, getByText, queryByTestId, invalidateSpy } =
      mountButton();
    await waitFor(() =>
      expect(getByText('Map players to divisions')).toBeTruthy()
    );
    await waitFor(() =>
      expect(queryByTestId('map-participations-button-checking')).toBeNull()
    );
    fireEvent.press(getByTestId('map-participations-button'));

    await waitFor(() => expect(mockMap).toHaveBeenCalled());
    expect(mockMap).toHaveBeenCalledWith(5, { confirm_overwrite: false });
    expect(mockConfirmAction).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(getByTestId('map-participations-button-success')).toBeTruthy();
    });
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it('confirms overwrite when participations already exist', async () => {
    mockPreview.mockResolvedValue({
      data: {
        can_map: true,
        disabled_reason: null,
        existing_participations_count: 3,
        registered_player_count: 4,
        division_specific_registration_count: 2,
        event_wide_registration_count: 2,
      },
    });

    const { getByTestId, getByText, queryByTestId } = mountButton();
    await waitFor(() =>
      expect(getByText('Map players to divisions')).toBeTruthy()
    );
    await waitFor(() =>
      expect(queryByTestId('map-participations-button-checking')).toBeNull()
    );
    fireEvent.press(getByTestId('map-participations-button'));

    await waitFor(() => expect(mockConfirmAction).toHaveBeenCalled());
    expect(mockConfirmAction).toHaveBeenCalledWith(
      'Map players to divisions',
      'This will overwrite all current participations for this event. Continue?',
      expect.any(Function)
    );
    expect(mockMap).toHaveBeenCalledWith(5, { confirm_overwrite: true });
  });

  it('warns when overwrite clears participations with zero registrations', async () => {
    mockPreview.mockResolvedValue({
      data: {
        can_map: true,
        disabled_reason: null,
        existing_participations_count: 1,
        registered_player_count: 0,
        division_specific_registration_count: 0,
        event_wide_registration_count: 0,
      },
    });

    const { getByTestId, getByText, queryByTestId } = mountButton();
    await waitFor(() =>
      expect(getByText('Map players to divisions')).toBeTruthy()
    );
    await waitFor(() =>
      expect(queryByTestId('map-participations-button-checking')).toBeNull()
    );
    fireEvent.press(getByTestId('map-participations-button'));

    await waitFor(() => {
      expect(mockConfirmAction).toHaveBeenCalledWith(
        'Map players to divisions',
        'This will remove all current participations. There are no registrations to map. Continue?',
        expect.any(Function)
      );
    });
  });

  it('shows error on button when map fails (no toast)', async () => {
    mockMap.mockRejectedValue(new Error('boom'));
    const { getByTestId, getByText, queryByTestId } = mountButton();
    await waitFor(() =>
      expect(getByText('Map players to divisions')).toBeTruthy()
    );
    await waitFor(() =>
      expect(queryByTestId('map-participations-button-checking')).toBeNull()
    );
    fireEvent.press(getByTestId('map-participations-button'));

    await waitFor(() => {
      expect(getByTestId('map-participations-button-error')).toBeTruthy();
    });
    expect(
      getByTestId('map-participations-button-tooltip').props.accessibilityHint
    ).toBe('boom');
  });

  it('respects mutationsDisabled with finalized hint', async () => {
    const { findByTestId } = mountButton({ mutationsDisabled: true });
    const tip = await findByTestId('map-participations-button-tooltip');
    expect(tip.props.accessibilityHint).toMatch(/finalized/i);
  });

  it('notes that only active registrations are mapped', async () => {
    const { findByTestId } = mountButton();
    expect(await findByTestId('map-participations-active-only-note')).toHaveTextContent(
      /Only active registrations are mapped/
    );
  });
});
