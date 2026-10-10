/**
 * @jest-environment jsdom
 */
import DivisionLevelBandsPicker from '@/components/divisions/DivisionLevelBandsPicker';
import DivisionLevelBandsSection from '@/components/divisions/DivisionLevelBandsSection';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockGetAllLevels = jest.fn();
const mockGetDivision = jest.fn();
const mockSyncLevels = jest.fn();
const mockUpdateDivision = jest.fn();

jest.mock('@/lib/actionButtonFeedback', () => ({
  playSuccess: jest.fn(async () => undefined),
  playError: jest.fn(async () => undefined),
}));

jest.mock('@/services/api/levelsApi', () => ({
  LevelsApiService: jest.fn().mockImplementation(() => ({
    getAllLevels: (...args: unknown[]) => mockGetAllLevels(...args),
  })),
}));

jest.mock('@/services/api/divisionsApi', () => ({
  DivisionsApiService: jest.fn().mockImplementation(() => ({
    getDivision: (...args: unknown[]) => mockGetDivision(...args),
    syncDivisionLevels: (...args: unknown[]) => mockSyncLevels(...args),
    updateDivision: (...args: unknown[]) => mockUpdateDivision(...args),
  })),
}));

const bands = [
  { id_level: 1, name: 'Div 3 Mid', level_min: '3.66', level_max: '3.34' },
  { id_level: 2, name: 'Div 3 Top', level_min: '3.33', level_max: '3.01' },
  { id_level: 3, name: 'Div 4 Low', level_min: '4.99', level_max: '4.67' },
];

describe('DivisionLevelBandsPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllLevels.mockResolvedValue(bands);
  });

  it('lists the read-only bands from the levels API and toggles selection', async () => {
    const onChange = jest.fn();
    const { findByTestId, getByText, rerender } = render(
      <DivisionLevelBandsPicker selectedIds={[1]} onChange={onChange} />
    );
    const band1 = await findByTestId('division-band-1');
    expect(mockGetAllLevels).toHaveBeenCalledTimes(1);
    expect(getByText('Div 3 Top (3.33 → 3.01)')).toBeTruthy();
    expect(band1.props.accessibilityState.checked).toBe(true);

    fireEvent.press(await findByTestId('division-band-2'));
    expect(onChange).toHaveBeenLastCalledWith([1, 2]);

    fireEvent.press(band1);
    expect(onChange).toHaveBeenLastCalledWith([]);

    rerender(
      <DivisionLevelBandsPicker selectedIds={[3]} onChange={onChange} disabled />
    );
    fireEvent.press(await findByTestId('division-band-2'));
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('shows an error when bands cannot be loaded', async () => {
    mockGetAllLevels.mockRejectedValue(new Error('offline'));
    const { findByTestId } = render(
      <DivisionLevelBandsPicker selectedIds={[]} onChange={jest.fn()} />
    );
    expect((await findByTestId('division-level-bands-error')).props.children).toBe(
      'offline'
    );
  });
});

describe('DivisionLevelBandsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllLevels.mockResolvedValue(bands);
    mockGetDivision.mockResolvedValue({
      data: {
        id_division: 5,
        level_min: '4.99',
        level_max: '4.67',
        levels: [bands[2]],
      },
    });
  });

  it('saves only level_ids and never sends or rewrites the bounds', async () => {
    mockSyncLevels.mockResolvedValue({
      data: { id_division: 5, levels: [bands[0], bands[2]] },
    });
    const { findByTestId, getByTestId } = render(
      <DivisionLevelBandsSection divisionId={5} />
    );
    expect(
      (await findByTestId('division-band-3')).props.accessibilityState.checked
    ).toBe(true);

    fireEvent.press(await findByTestId('division-band-1'));
    fireEvent.press(getByTestId('division-level-bands-save'));

    await waitFor(() => expect(mockSyncLevels).toHaveBeenCalledWith(5, [3, 1]));
    expect(mockUpdateDivision).not.toHaveBeenCalled();
    const args = mockSyncLevels.mock.calls[0];
    expect(args).toHaveLength(2);
    expect(JSON.stringify(args)).not.toContain('level_min');
    expect(JSON.stringify(args)).not.toContain('level_max');
  });

  it('keeps Save bands disabled until the selection changes', async () => {
    const { findByTestId, getByTestId } = render(
      <DivisionLevelBandsSection divisionId={5} />
    );
    await findByTestId('division-band-3');
    fireEvent.press(getByTestId('division-level-bands-save'));
    expect(mockSyncLevels).not.toHaveBeenCalled();
  });
});
