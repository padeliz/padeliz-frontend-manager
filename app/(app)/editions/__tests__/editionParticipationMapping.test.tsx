import EditionParticipationMappingButton from '@/components/editions/EditionParticipationMappingButton';
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
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('@/services/api/editionParticipationMappingApi', () => ({
  EditionParticipationMappingApiService: jest.fn().mockImplementation(() => ({
    preview: (...args: unknown[]) => mockPreview(...args),
    map: (...args: unknown[]) => mockMap(...args),
  })),
}));

jest.mock('@/components/editions/editionLotteryUtils', () => ({
  confirmAction: (...args: unknown[]) => mockConfirmAction(...args),
}));

jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}));

function renderButton(
  props: { editionId?: number; mutationsDisabled?: boolean } = {}
) {
  const queryClient = createTestQueryClient();
  const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <EditionParticipationMappingButton
        editionId={props.editionId ?? 5}
        mutationsDisabled={props.mutationsDisabled ?? false}
      />
    </QueryClientProvider>
  );
  return { ...utils, queryClient, invalidateSpy };
}

describe('EditionParticipationMappingButton', () => {
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
        edition_wide_registration_count: 2,
      },
    });
    mockMap.mockResolvedValue({
      data: { created_count: 4, by_edition_division: [] },
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
    props: { editionId?: number; mutationsDisabled?: boolean } = {}
  ) {
    const mounted = renderButton(props);
    activeClient = mounted.queryClient;
    activeUnmount = mounted.unmount;
    return mounted;
  }

  it.each([
    ['finalized', 'Edition is finalized — participations cannot be remapped.'],
    ['schedule_exists', 'Cannot map after a schedule has been generated.'],
    ['lottery_exists', 'Cannot map after lottery draws exist for this edition.'],
    ['no_divisions', 'Add edition divisions before mapping participations.'],
  ] as const)(
    'shows disabled hint for preview disabled_reason=%s',
    async (reason, hint) => {
      mockPreview.mockResolvedValue({
        data: {
          can_map: false,
          disabled_reason: reason,
          existing_participations_count: 0,
          registered_player_count: 0,
          division_specific_registration_count: 0,
          edition_wide_registration_count: 0,
        },
      });

      const { findByTestId } = mountButton();
      const hintNode = await findByTestId('map-participations-hint');
      expect(hintNode).toHaveTextContent(hint);
    }
  );

  it('maps immediately when there are no existing participations', async () => {
    const { getByTestId, getByText, invalidateSpy } = mountButton();
    await waitFor(() => expect(getByText('Map players to divisions')).toBeTruthy());
    fireEvent.press(getByTestId('map-participations-button'));

    await waitFor(() => {
      expect(mockMap).toHaveBeenCalledWith(5, { confirm_overwrite: false });
    });
    expect(mockConfirmAction).not.toHaveBeenCalled();
    expect(mockShowSuccess).toHaveBeenCalledWith(
      'Participations mapped',
      'Mapped 4 participations.'
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['editionParticipations', 5],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['editionParticipationMapPreview', 5],
    });
  });

  it('confirms overwrite when existing participations exist', async () => {
    mockPreview.mockResolvedValue({
      data: {
        can_map: true,
        disabled_reason: null,
        existing_participations_count: 2,
        registered_player_count: 3,
        division_specific_registration_count: 1,
        edition_wide_registration_count: 2,
      },
    });

    const { getByTestId, getByText } = mountButton();
    await waitFor(() => expect(getByText('Map players to divisions')).toBeTruthy());
    fireEvent.press(getByTestId('map-participations-button'));

    await waitFor(() => {
      expect(mockConfirmAction).toHaveBeenCalledWith(
        'Map players to divisions',
        'This will overwrite all current participations for this edition. Continue?',
        expect.any(Function)
      );
    });
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
        edition_wide_registration_count: 0,
      },
    });

    const { getByTestId, getByText } = mountButton();
    await waitFor(() => expect(getByText('Map players to divisions')).toBeTruthy());
    fireEvent.press(getByTestId('map-participations-button'));

    await waitFor(() => {
      expect(mockConfirmAction).toHaveBeenCalledWith(
        'Map players to divisions',
        'This will remove all current participations. There are no registrations to map. Continue?',
        expect.any(Function)
      );
    });
  });

  it('shows finalized hint when mutationsDisabled even if preview allows map', async () => {
    const { findByTestId } = mountButton({ mutationsDisabled: true });
    const hintNode = await findByTestId('map-participations-hint');
    expect(hintNode).toHaveTextContent(
      'Edition is finalized — participations cannot be remapped.'
    );
  });

  it('shows toast error when map fails', async () => {
    mockMap.mockRejectedValue(new Error('Lottery locked'));
    const { getByTestId, getByText } = mountButton();
    await waitFor(() => expect(getByText('Map players to divisions')).toBeTruthy());
    fireEvent.press(getByTestId('map-participations-button'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Mapping failed',
        'Lottery locked'
      );
    });
  });
});
