import ChallengeSyncStatusBadge from '@/components/challenges/ChallengeSyncStatusBadge';
import { act, render } from '@testing-library/react-native';
import React from 'react';

describe('ChallengeSyncStatusBadge', () => {
  it('renders phase labels with opacity-30 styling and matching a11y', () => {
    const phases = [
      { phase: 'saving' as const, label: 'Saving...' },
      { phase: 'retrying' as const, label: 'Retrying...' },
      { phase: 'saved' as const, label: 'Saved' },
      { phase: 'failed' as const, label: 'Failed' },
    ];

    for (const badge of phases) {
      const { getByTestId, getByText, queryByTestId, unmount } = render(
        <ChallengeSyncStatusBadge badge={badge} />
      );
      const root = getByTestId('challenge-sync-status-badge');
      expect(root.props.accessibilityLabel).toBe(badge.label);
      const text = getByText(badge.label);
      expect(text.props.className).toMatch(/text-black opacity-30/);
      expect(text.props.className).not.toMatch(/text-red-|text-green-/);

      if (badge.phase === 'saved') {
        expect(getByTestId('sync-badge-icon-saved')).toBeTruthy();
        expect(queryByTestId('sync-badge-icon-failed')).toBeNull();
      } else if (badge.phase === 'failed') {
        expect(getByTestId('sync-badge-icon-failed')).toBeTruthy();
        expect(queryByTestId('sync-badge-icon-saved')).toBeNull();
      } else {
        expect(queryByTestId('sync-badge-icon-saved')).toBeNull();
        expect(queryByTestId('sync-badge-icon-failed')).toBeNull();
      }
      unmount();
    }
  });

  it('keeps label mounted during fade-out then unmounts', () => {
    jest.useFakeTimers();
    const { getByTestId, queryByTestId, rerender } = render(
      <ChallengeSyncStatusBadge badge={{ phase: 'saved', label: 'Saved' }} />
    );
    expect(getByTestId('challenge-sync-status-badge')).toBeTruthy();

    rerender(
      <ChallengeSyncStatusBadge badge={{ phase: 'hidden', label: null }} />
    );
    expect(getByTestId('challenge-sync-status-badge')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(queryByTestId('challenge-sync-status-badge')).toBeNull();
    jest.useRealTimers();
  });
});
