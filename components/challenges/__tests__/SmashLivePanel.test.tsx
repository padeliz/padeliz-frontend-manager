import SmashLivePanel from '@/components/challenges/SmashLivePanel';
import {
  act,
  fireEvent,
  render,
  waitFor,
  within,
} from '@testing-library/react-native';
import React from 'react';
import { Image } from 'react-native';

const mockRunSmash = jest.fn();
const getSizeSpy = jest.spyOn(Image, 'getSize');

jest.mock('@/components/ui/ActionButton', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return ({
    label,
    testID,
    disabled,
    onPress,
    accessibilityLabel,
    iconOnly,
  }: {
    label: string;
    testID?: string;
    disabled?: boolean;
    onPress?: () => void;
    accessibilityLabel?: string;
    iconOnly?: boolean;
  }) => (
    <Pressable
      testID={testID ?? `header-${label}`}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
    >
      {iconOnly ? null : <Text>{label}</Text>}
    </Pressable>
  );
});

jest.mock('@/components/ui/Tooltip', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return ({
    content,
    children,
  }: {
    content: string;
    children: React.ReactNode;
  }) => (
    <View testID="complete-tooltip">
      <Text testID="complete-tooltip-content">{content}</Text>
      {children}
    </View>
  );
});

jest.mock('@/components/editions/SortableRow', () => {
  const React = require('react');
  const { View } = require('react-native');
  const SortableRow = ({ children }: { children: React.ReactNode }) => (
    <View>{children}</View>
  );
  const SortableDragHandle = ({ testID }: { testID?: string }) => (
    <View testID={testID} />
  );
  return { __esModule: true, default: SortableRow, SortableDragHandle };
});

jest.mock('@/components/ui/SingleSelectDropdown', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');
  return (props: Record<string, unknown>) => {
    return (
      <View testID="smash-detail-dropdown-inner">
        <Text>{String(props.className ?? '')}</Text>
        <Pressable
          testID="smash-detail-open"
          onPress={() => {
            if (typeof props.onOpenChange === 'function') {
              props.onOpenChange(true);
            }
          }}
        />
        <Pressable
          testID="smash-detail-close"
          onPress={() => {
            if (typeof props.onOpenChange === 'function') {
              props.onOpenChange(false);
            }
          }}
        />
      </View>
    );
  };
});

const liveBase: {
  session: {
    id_challenge_session: number;
    type: string;
    status: string;
    title: string;
    started_at: number;
    completed_at: number | null;
  };
  can_manual_jump_in: boolean;
  can_complete: boolean;
  complete_blocked_reasons: string[];
  court_count: number;
  waiting: Array<Record<string, unknown>>;
  court: Record<string, unknown> | null;
  leaderboard: Array<Record<string, unknown>>;
} = {
  session: {
    id_challenge_session: 2,
    type: 'smash_contest',
    status: 'completed',
    title: 'Smash Contest Live Session XX',
    bottom_text: 'Smash Contest Live Session XX',
    started_at: 1,
    completed_at: 2,
  },
  can_manual_jump_in: false,
  can_complete: true,
  complete_blocked_reasons: [],
  court_count: 0,
  waiting: [],
  court: null,
  leaderboard: [],
};

jest.mock('@/hooks/useChallengeSession', () => ({
  useChallengeSession: () => ({
    live: {
      ...liveBase,
      session: { ...liveBase.session },
      waiting: [...liveBase.waiting],
      court: liveBase.court
        ? { ...liveBase.court }
        : liveBase.court,
      leaderboard: [...liveBase.leaderboard],
      complete_blocked_reasons: [...liveBase.complete_blocked_reasons],
    },
    loading: false,
    error: null,
    runKotc: jest.fn(),
    runSmash: (...args: unknown[]) => mockRunSmash(...args),
    undo: jest.fn(),
    syncBadge: { phase: 'hidden', label: null },
  }),
}));

describe('SmashLivePanel', () => {
  beforeEach(() => {
    getSizeSpy.mockImplementation((_uri, success) => {
      success?.(50, 25);
    });
    mockRunSmash.mockReset();
    mockRunSmash.mockResolvedValue(undefined);
    liveBase.session.status = 'completed';
    liveBase.can_manual_jump_in = false;
    liveBase.can_complete = true;
    liveBase.complete_blocked_reasons = [];
    liveBase.waiting = [];
    liveBase.court = null;
    liveBase.leaderboard = [];
  });

  afterAll(() => {
    getSizeSpy.mockRestore();
  });

  it('active session: icon-only undo/complete with a11y labels; reactivate stays text', async () => {
    liveBase.session.status = 'active';
    liveBase.can_complete = true;
    const { getByTestId, queryByText } = render(<SmashLivePanel sessionId={2} />);
    await waitFor(() => expect(getByTestId('smash-live-panel')).toBeTruthy());
    expect(getByTestId('smash-undo').props.accessibilityLabel).toBe('Undo');
    expect(getByTestId('smash-complete').props.accessibilityLabel).toBe(
      'Complete'
    );
    expect(queryByText('↩️')).toBeNull();
    expect(queryByText('✔️')).toBeNull();
  });

  it('disables undo when completed and shows reactivate', async () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <SmashLivePanel sessionId={2} />
    );
    await waitFor(() => expect(getByTestId('smash-live-panel')).toBeTruthy());
    expect(getByTestId('smash-reactivate')).toHaveTextContent('Reactivate');
    expect(queryByTestId('smash-undo')).toBeNull();
    expect(queryByTestId('smash-rename-input')).toBeNull();
    expect(
      getByText('Smash Contest Live Session XX').props.className
    ).toMatch(/text-5xl/);
  });

  it('active: two-column shell, enter-only add, icon waiting actions', async () => {
    liveBase.session.status = 'active';
    liveBase.can_manual_jump_in = true;
    liveBase.can_complete = false;
    liveBase.complete_blocked_reasons = ['Court occupied'];
    liveBase.waiting = [
      {
        participation_id: 'p1',
        player_id: '20',
        player_name: 'Player Alpha',
        session_tries: 0,
        record_hold_seconds: 0,
        queue_position: 1,
      },
    ];

    const { getByTestId, queryByText, queryByTestId, getByText } = render(
      <SmashLivePanel sessionId={2} />
    );

    expect(getByTestId('smash-live-columns').props.className).toMatch(
      /lg:flex-row/
    );
    expect(getByTestId('smash-live-panel').props.className).toMatch(/pb-0/);
    expect(getByTestId('smash-title-row').props.className).toMatch(/items-end/);
    expect(getByTestId('smash-rename-input').props.className).toMatch(
      /text-5xl/
    );
    expect(getByTestId('smash-rename-input').props.className).toMatch(
      /outline-none/
    );
    expect(getByTestId('smash-rename-input').props.className).toMatch(
      /focus:border-gray-50/
    );
    expect(getByText('In the Court')).toBeTruthy();
    expect(queryByText('Rename')).toBeNull();
    expect(queryByText(/Complete blocked/)).toBeNull();
    expect(queryByTestId('smash-add-player-submit')).toBeNull();
    expect(getByTestId('smash-jump-in-20')).toBeTruthy();
    expect(getByTestId('smash-remove-20')).toBeTruthy();
    expect(queryByText('Jump in')).toBeNull();
    expect(queryByText('Remove')).toBeNull();
    expect(queryByText('⬆️')).toBeNull();
    expect(queryByText('🗑️')).toBeNull();
    expect(getByTestId('smash-drag-20')).toBeTruthy();
    expect(getByTestId('smash-leaderboard-table')).toBeTruthy();
    expect(getByTestId('smash-live-col-left').props.className).toMatch(
      /lg:flex-\[2\]/
    );
    expect(getByTestId('smash-live-col-right').props.className).toMatch(
      /lg:flex-\[3\]/
    );
    expect(getByTestId('smash-leaderboard-section').props.className).not.toMatch(
      /flex-1/
    );
    expect(getByTestId('smash-coordinators')).toBeTruthy();
    expect(getByTestId('smash-prize-partners')).toBeTruthy();
    expect(getByTestId('smash-coordinators-cell-0-0').props.className).toMatch(
      /items-start/
    );
    expect(getByTestId('smash-coordinators-cell-0-0').props.style).toEqual(
      expect.objectContaining({ height: 95, minHeight: 95 })
    );
    expect(getByTestId('smash-coordinators-rows').props.className).toMatch(
      /gap-3/
    );
    expect(getByTestId('smash-coordinators-row-0').props.className).toMatch(
      /gap-4/
    );
    expect(getByTestId('smash-prize-partners-cell-0-0').props.className).toMatch(
      /items-center/
    );
    expect(getByTestId('smash-prize-partners-cell-0-0').props.style).toEqual(
      expect.objectContaining({ height: 48, minHeight: 48 })
    );
    expect(getByTestId('smash-prize-partners-rows').props.className).toMatch(
      /gap-4/
    );
    expect(getByTestId('smash-prize-partners-row-0').props.className).toMatch(
      /gap-5/
    );
    expect(getByTestId('smash-court-vacant')).toBeTruthy();
    expect(getByText('...')).toBeTruthy();
    expect(queryByText('Vacant')).toBeNull();
    expect(getByTestId('complete-tooltip-content').props.children).toBe(
      'Court occupied'
    );
    expect(getByTestId('smash-add-player-input').props.placeholder).toBe(
      'Add player name'
    );
    expect(getByTestId('smash-add-player-input').props.className).toMatch(
      /outline-none/
    );
    expect(getByTestId('smash-add-player-input').props.className).not.toMatch(
      /focus:border-gray-50/
    );
    expect(getByTestId('smash-add-player-input').props.maxLength).toBe(20);

    const input = getByTestId('smash-rename-input');
    fireEvent.changeText(input, 'Short');
    fireEvent(input, 'submitEditing');
    expect(mockRunSmash).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'rename' })
    );

    fireEvent.changeText(input, 'Valid Smash Contest Title XX');
    fireEvent(input, 'submitEditing');
    expect(mockRunSmash).toHaveBeenCalledWith({
      type: 'rename',
      title: 'Valid Smash Contest Title XX',
    });
  });

  function SmashFooterHost({
    onReady,
  }: {
    onReady?: (node: React.ReactNode | null) => void;
  }) {
    const [footer, setFooter] = React.useState<React.ReactNode | null>(null);
    return (
      <>
        <SmashLivePanel
          sessionId={2}
          onFooterReady={node => {
            setFooter(node);
            onReady?.(node);
          }}
        />
        {footer}
      </>
    );
  }

  it('bottom text footer saves, rejects, and blurs', async () => {
    liveBase.session.status = 'active';
    const { getByTestId } = render(<SmashFooterHost />);
    await waitFor(() =>
      expect(getByTestId('smash-bottom-text-input')).toBeTruthy()
    );
    const wrap = getByTestId('smash-bottom-text-input-wrap');
    expect(wrap.props.className).toMatch(/px-6/);
    expect(wrap.props.className).toMatch(/bg-gray-50/);
    expect(wrap.props.className).toMatch(/py-3/);
    expect(wrap.props.style == null || wrap.props.style.shadowColor == null).toBe(
      true
    );
    expect(wrap.props.style == null || wrap.props.style.elevation == null).toBe(
      true
    );
    const input = getByTestId('smash-bottom-text-input');
    expect(input.props.placeholder).toBe('Bottom text');
    expect(input.props.className).toMatch(/text-3xl/);
    expect(input.props.className).toMatch(/text-center/);
    expect(input.props.className).toMatch(/pb-\[4px\]/);
    expect(input.props.className).toMatch(/outline-none/);
    expect(input.props.className).toMatch(/focus:border-gray-50/);

    fireEvent.changeText(input, 'Short');
    fireEvent(input, 'submitEditing');
    await waitFor(() =>
      expect(getByTestId('smash-bottom-text-input').props.value).toBe(
        'Smash Contest Live Session XX'
      )
    );
    expect(mockRunSmash).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'rename_bottom_text' })
    );

    fireEvent.changeText(
      getByTestId('smash-bottom-text-input'),
      'Valid Smash Bottom Text XX'
    );
    fireEvent(getByTestId('smash-bottom-text-input'), 'submitEditing');
    expect(mockRunSmash).toHaveBeenCalledWith({
      type: 'rename_bottom_text',
      bottom_text: 'Valid Smash Bottom Text XX',
    });

    fireEvent.changeText(
      getByTestId('smash-bottom-text-input'),
      'Draft bottom that is long enough'
    );
    fireEvent(getByTestId('smash-bottom-text-input'), 'blur');
    await waitFor(() =>
      expect(getByTestId('smash-bottom-text-input').props.value).toBe(
        'Smash Contest Live Session XX'
      )
    );
  });

  it('bottom text footer clears on unmount', async () => {
    liveBase.session.status = 'active';
    let last: React.ReactNode | undefined = undefined;
    const { unmount } = render(
      <SmashFooterHost
        onReady={node => {
          last = node;
        }}
      />
    );
    await waitFor(() => expect(last).toBeTruthy());
    unmount();
    expect(last).toBeNull();
  });

  it('does not re-notify footer when live identity churns', async () => {
    liveBase.session.status = 'active';
    let calls = 0;
    let setBump: ((n: number) => void) | undefined;
    function Host() {
      const [, bump] = React.useState(0);
      setBump = bump;
      const [footer, setFooter] = React.useState<React.ReactNode | null>(null);
      return (
        <>
          <SmashLivePanel
            sessionId={2}
            onFooterReady={node => {
              calls += 1;
              setFooter(node);
            }}
          />
          {footer}
        </>
      );
    }
    const { getByTestId } = render(<Host />);
    await waitFor(() =>
      expect(getByTestId('smash-bottom-text-input')).toBeTruthy()
    );
    const settled = calls;
    expect(settled).toBeGreaterThan(0);
    for (let i = 0; i < 5; i += 1) {
      act(() => {
        setBump?.(i + 1);
      });
    }
    expect(calls).toBe(settled);
  });

  it('bottom text is read-only when session completed', async () => {
    liveBase.session.status = 'completed';
    const { getByTestId, queryByPlaceholderText } = render(<SmashFooterHost />);
    await waitFor(() =>
      expect(getByTestId('smash-bottom-text-input')).toBeTruthy()
    );
    expect(getByTestId('smash-bottom-text-input').props.children).toBe(
      'Smash Contest Live Session XX'
    );
    expect(getByTestId('smash-bottom-text-input').props.className).toMatch(
      /text-3xl/
    );
    expect(getByTestId('smash-bottom-text-input').props.className).toMatch(
      /text-center/
    );
    expect(getByTestId('smash-bottom-text-input').props.className).toMatch(
      /pb-\[4px\]/
    );
    expect(queryByPlaceholderText('Bottom text')).toBeNull();
    liveBase.session.status = 'active';
  });

  it('waiting full silently disables add input', async () => {
    liveBase.session.status = 'active';
    liveBase.waiting = Array.from({ length: 6 }, (_, i) => ({
      participation_id: `p${i}`,
      player_id: String(i),
      player_name: `Player ${i}`,
      session_tries: 0,
      record_hold_seconds: 0,
      queue_position: i + 1,
    }));
    const { getByTestId, queryByText } = render(
      <SmashLivePanel sessionId={2} />
    );
    expect(getByTestId('smash-add-player-input').props.editable).toBe(false);
    expect(queryByText(/full/i)).toBeNull();
  });

  it('duplicate flash on waiting row via Enter', async () => {
    liveBase.session.status = 'active';
    liveBase.waiting = [
      {
        participation_id: 'p1',
        player_id: '20',
        player_name: 'Player Alpha',
        session_tries: 0,
        record_hold_seconds: 0,
        queue_position: 1,
      },
    ];
    mockRunSmash.mockResolvedValue({
      code: 'duplicate_active',
      duplicate: { id: '20', location: 'waiting' },
    });

    const { getByTestId } = render(<SmashLivePanel sessionId={2} />);
    fireEvent.changeText(getByTestId('smash-add-player-input'), 'Player Alpha');
    fireEvent(getByTestId('smash-add-player-input'), 'submitEditing');
    await waitFor(() => {
      expect(getByTestId('smash-waiting-20').props.className).toMatch(
        /border-red-500/
      );
    });
  });

  it('court hover cluster: return, toggle, detail, attempt order; trophy when toggle on', async () => {
    liveBase.session.status = 'active';
    liveBase.court = {
      participation_id: 'c1',
      player_id: '9',
      player_name: 'Court Ace',
      session_tries: 2,
      record_hold_seconds: 10,
      is_record_holder: true,
    };
    liveBase.leaderboard = [
      {
        position: 1,
        player_id: '9',
        player_name: 'Court Ace',
        session_tries: 2,
        record_hold_seconds: 10,
        is_record_holder: true,
        slot: 'on_court',
      },
    ];

    const { getByTestId, queryByTestId, getByText, queryByText } = render(
      <SmashLivePanel sessionId={2} />
    );

    expect(getByTestId('smash-court-9')).toBeTruthy();
    const controls = getByTestId('smash-court-controls');
    const childTestIds = controls.props.children
      .flat()
      .filter(Boolean)
      .map((child: { props?: { testID?: string } }) => child?.props?.testID)
      .filter(Boolean);
    expect(childTestIds.indexOf('smash-return-9')).toBeLessThan(
      childTestIds.indexOf('smash-new-record-toggle')
    );
    expect(childTestIds.indexOf('smash-new-record-toggle')).toBeLessThan(
      childTestIds.indexOf('smash-record-attempt')
    );
    expect(queryByTestId('smash-detail-dropdown')).toBeNull();
    expect(getByTestId('smash-record-attempt')).toBeTruthy();
    expect(getByTestId('smash-return-9')).toBeTruthy();
    expect(getByTestId('smash-record-attempt').props.accessibilityLabel).toBe(
      'Confirm attempt'
    );
    expect(queryByText('⬇️')).toBeNull();
    expect(getByText(/#1 · Tries: 2 · Record Holder/)).toBeTruthy();

    fireEvent(getByTestId('smash-new-record-toggle'), 'valueChange', true);
    const detailWrap = getByTestId('smash-detail-dropdown');
    expect(detailWrap.props.className).toMatch(/max-w-\[12rem\]/);
    expect(queryByText('🏆')).toBeNull();
    expect(queryByText('✅')).toBeNull();
    expect(getByTestId('smash-record-attempt').props.accessibilityLabel).toBe(
      'Record new record'
    );
    const childTestIdsOn = controls.props.children
      .flat()
      .filter(Boolean)
      .map((child: { props?: { testID?: string } }) => child?.props?.testID)
      .filter(Boolean);
    expect(childTestIdsOn.indexOf('smash-new-record-toggle')).toBeLessThan(
      childTestIdsOn.indexOf('smash-detail-dropdown')
    );
    expect(childTestIdsOn.indexOf('smash-detail-dropdown')).toBeLessThan(
      childTestIdsOn.indexOf('smash-record-attempt')
    );
    fireEvent.press(within(detailWrap).getByTestId('smash-detail-open'));
    fireEvent(getByTestId('smash-new-record-toggle'), 'valueChange', false);
    expect(queryByTestId('smash-detail-dropdown')).toBeNull();
  });

  it('waiting row shows em dash when player has no stats', async () => {
    liveBase.session.status = 'active';
    liveBase.leaderboard = [];
    liveBase.waiting = [
      {
        participation_id: 'p1',
        player_id: '20',
        player_name: 'Player Alpha',
        session_tries: 0,
        record_hold_seconds: 0,
        queue_position: 1,
      },
    ];
    const { getByTestId, getByText } = render(<SmashLivePanel sessionId={2} />);
    await waitFor(() => expect(getByTestId('smash-waiting-20')).toBeTruthy());
    expect(getByText('—')).toBeTruthy();
  });

  it('confirm and return dispatch commands; return disabled when waiting full', async () => {
    liveBase.session.status = 'active';
    liveBase.court = {
      participation_id: 'c1',
      player_id: '9',
      player_name: 'Court Ace',
      session_tries: 1,
      record_hold_seconds: 0,
      is_record_holder: false,
    };
    const { getByTestId, rerender } = render(<SmashLivePanel sessionId={2} />);
    fireEvent.press(getByTestId('smash-record-attempt'));
    expect(mockRunSmash).toHaveBeenCalledWith({
      type: 'record_attempt',
      gotNewRecord: false,
      detail: '',
    });
    fireEvent.press(getByTestId('smash-return-9'));
    expect(mockRunSmash).toHaveBeenCalledWith({
      type: 'return_to_waiting',
      playerId: '9',
    });

    liveBase.waiting = Array.from({ length: 6 }, (_, i) => ({
      participation_id: `p${i}`,
      player_id: String(i),
      player_name: `Player ${i}`,
      session_tries: 0,
      record_hold_seconds: 0,
      queue_position: i + 1,
    }));
    rerender(<SmashLivePanel sessionId={2} />);
    expect(
      getByTestId('smash-return-9').props.accessibilityState.disabled
    ).toBe(true);
  });

  it('LB requeue shown for removed only; Record Holding column present', async () => {
    liveBase.session.status = 'active';
    liveBase.leaderboard = [
      {
        position: 1,
        player_id: 'r1',
        player_name: 'Removed',
        session_tries: 3,
        record_hold_seconds: 65,
        is_record_holder: false,
        slot: 'removed',
      },
      {
        position: 2,
        player_id: 'w1',
        player_name: 'Waiting',
        session_tries: 1,
        record_hold_seconds: 0,
        is_record_holder: false,
        slot: 'waiting',
      },
    ];
    liveBase.waiting = [
      {
        participation_id: 'p1',
        player_id: 'w1',
        player_name: 'Waiting',
        session_tries: 1,
        record_hold_seconds: 0,
        queue_position: 1,
      },
    ];
    const { getByTestId, queryByTestId, getByText } = render(
      <SmashLivePanel sessionId={2} />
    );
    expect(getByTestId('smash-requeue-r1')).toBeTruthy();
    expect(queryByTestId('smash-requeue-w1')).toBeNull();
    expect(getByText('Record Holding')).toBeTruthy();
    fireEvent.press(getByTestId('smash-requeue-r1'));
    expect(mockRunSmash).toHaveBeenCalledWith({
      type: 'requeue',
      playerId: 'r1',
    });
  });
});
