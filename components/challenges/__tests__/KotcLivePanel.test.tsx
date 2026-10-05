import KotcLivePanel from '@/components/challenges/KotcLivePanel';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Image } from 'react-native';

const mockRunKotc = jest.fn();
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

jest.mock('@/components/events/SortableRow', () => {
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
  const { View } = require('react-native');
  return () => <View />;
});

const liveBase = {
  session: {
    id_challenge_session: 1,
    type: 'king_of_the_court',
    status: 'active',
    title: 'King of the Court Live Session',
    bottom_text: 'King of the Court Live Session',
    started_at: 1,
    completed_at: null,
  },
  can_manual_jump_in: true,
  can_complete: false,
  complete_blocked_reasons: ['Waiting list not empty'],
  court_count: 0,
  waiting: [
    {
      participation_id: 'p1',
      team_id: '10',
      team_name: 'Alpha Squad',
      biggest_streak: 0,
      second_biggest_streak: 0,
      queue_position: 1,
    },
  ],
  court: { team_a: null, team_b: null },
  leaderboard: [] as Array<Record<string, unknown>>,
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
    runKotc: (...args: unknown[]) => mockRunKotc(...args),
    runSmash: jest.fn(),
    undo: jest.fn(),
    syncBadge: { phase: 'hidden', label: null },
  }),
}));

describe('KotcLivePanel', () => {
  beforeEach(() => {
    getSizeSpy.mockImplementation((_uri, success) => {
      success?.(50, 25);
    });
    mockRunKotc.mockReset();
    mockRunKotc.mockResolvedValue(undefined);
    liveBase.session.status = 'active';
    liveBase.can_complete = false;
    liveBase.complete_blocked_reasons = ['Waiting list not empty'];
    liveBase.court_count = 0;
    liveBase.court = { team_a: null, team_b: null };
    liveBase.waiting = [
      {
        participation_id: 'p1',
        team_id: '10',
        team_name: 'Alpha Squad',
        biggest_streak: 0,
        second_biggest_streak: 0,
        queue_position: 1,
      },
    ];
    liveBase.leaderboard = [];
  });

  afterAll(() => {
    getSizeSpy.mockRestore();
  });

  it('active session: icon-only undo/complete with a11y labels', async () => {
    const { getByTestId, queryByText } = render(<KotcLivePanel sessionId={1} />);
    await waitFor(() => expect(getByTestId('kotc-live-panel')).toBeTruthy());
    expect(getByTestId('kotc-undo').props.accessibilityLabel).toBe('Undo');
    expect(getByTestId('kotc-complete').props.accessibilityLabel).toBe(
      'Complete'
    );
    expect(queryByText('↩️')).toBeNull();
    expect(queryByText('✔️')).toBeNull();
  });

  it('shows title input, court labels, no blocked banner, no rename/add buttons', async () => {
    const { getByTestId, queryByText, queryByTestId, getByText } = render(
      <KotcLivePanel sessionId={1} />
    );

    await waitFor(() => expect(getByTestId('kotc-live-panel')).toBeTruthy());
    expect(getByTestId('kotc-live-panel').props.className).toMatch(/pb-0/);
    expect(getByTestId('kotc-title-row').props.className).toMatch(/items-end/);
    expect(getByTestId('kotc-rename-input').props.className).toMatch(/text-5xl/);
    expect(getByTestId('kotc-rename-input').props.className).toMatch(
      /outline-none/
    );
    expect(getByTestId('kotc-rename-input').props.className).toMatch(
      /focus:border-gray-50/
    );
    expect(getByText('In the Court')).toBeTruthy();
    expect(queryByText('Rename')).toBeNull();
    expect(queryByText(/Complete blocked/)).toBeNull();
    expect(queryByTestId('kotc-add-team-submit')).toBeNull();
    expect(getByText('TEAM A')).toBeTruthy();
    expect(getByText('TEAM B')).toBeTruthy();
    expect(getByTestId('kotc-court-team_a-vacant')).toBeTruthy();
    expect(getByTestId('kotc-court-team_b-vacant')).toBeTruthy();
    expect(getByTestId('kotc-jump-in-10')).toBeTruthy();
    expect(getByTestId('kotc-remove-10')).toBeTruthy();
    expect(getByTestId('kotc-drag-10')).toBeTruthy();
    expect(getByTestId('kotc-leaderboard-table')).toBeTruthy();
    expect(getByTestId('kotc-live-col-left').props.className).toMatch(
      /lg:flex-\[2\]/
    );
    expect(getByTestId('kotc-live-col-right').props.className).toMatch(
      /lg:flex-\[3\]/
    );
    expect(getByTestId('kotc-leaderboard-section').props.className).not.toMatch(
      /flex-1/
    );
    expect(getByTestId('kotc-coordinators')).toBeTruthy();
    expect(getByTestId('kotc-prize-partners')).toBeTruthy();
    expect(getByTestId('kotc-coordinators-cell-0-0').props.className).toMatch(
      /items-start/
    );
    expect(getByTestId('kotc-coordinators-cell-0-0').props.style).toEqual(
      expect.objectContaining({ height: 95, minHeight: 95 })
    );
    expect(getByTestId('kotc-coordinators-rows').props.className).toMatch(
      /gap-3/
    );
    expect(getByTestId('kotc-coordinators-row-0').props.className).toMatch(
      /gap-4/
    );
    expect(getByTestId('kotc-prize-partners-cell-0-0').props.className).toMatch(
      /items-center/
    );
    expect(getByTestId('kotc-prize-partners-cell-0-0').props.style).toEqual(
      expect.objectContaining({ height: 48, minHeight: 48 })
    );
    expect(getByTestId('kotc-prize-partners-rows').props.className).toMatch(
      /gap-4/
    );
    expect(getByTestId('kotc-prize-partners-row-0').props.className).toMatch(
      /gap-5/
    );
    expect(getByTestId('complete-tooltip-content').props.children).toBe(
      'Waiting list not empty'
    );
    expect(getByTestId('kotc-complete').props.accessibilityState.disabled).toBe(
      true
    );
    expect(getByTestId('kotc-add-team-input').props.placeholder).toBe(
      'Add team name'
    );
    expect(getByTestId('kotc-add-team-input').props.className).toMatch(
      /outline-none/
    );
    expect(getByTestId('kotc-add-team-input').props.className).not.toMatch(
      /focus:border-gray-50/
    );
    expect(getByTestId('kotc-add-team-input').props.maxLength).toBe(35);
  });

  it('title enter valid renames; invalid resets without command', async () => {
    const { getByTestId } = render(<KotcLivePanel sessionId={1} />);
    const input = getByTestId('kotc-rename-input');

    fireEvent.changeText(input, 'Short');
    fireEvent(input, 'submitEditing');
    expect(mockRunKotc).not.toHaveBeenCalled();
    expect(input.props.value).toBe('King of the Court Live Session');

    fireEvent.changeText(input, 'Valid Renamed Challenge Title');
    fireEvent(input, 'submitEditing');
    expect(mockRunKotc).toHaveBeenCalledWith({
      type: 'rename',
      title: 'Valid Renamed Challenge Title',
    });
  });

  it('title blur resets draft', async () => {
    const { getByTestId } = render(<KotcLivePanel sessionId={1} />);
    const input = getByTestId('kotc-rename-input');
    fireEvent.changeText(input, 'Draft title that is long enough!!');
    fireEvent(input, 'blur');
    expect(input.props.value).toBe('King of the Court Live Session');
  });

  function FooterHost({
    onReady,
  }: {
    onReady?: (node: React.ReactNode | null) => void;
  }) {
    const [footer, setFooter] = React.useState<React.ReactNode | null>(null);
    return (
      <>
        <KotcLivePanel
          sessionId={1}
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
    const { getByTestId } = render(<FooterHost />);
    await waitFor(() =>
      expect(getByTestId('kotc-bottom-text-input')).toBeTruthy()
    );
    const wrap = getByTestId('kotc-bottom-text-input-wrap');
    expect(wrap.props.className).toMatch(/px-6/);
    expect(wrap.props.className).toMatch(/bg-gray-50/);
    expect(wrap.props.className).toMatch(/py-3/);
    expect(wrap.props.style == null || wrap.props.style.shadowColor == null).toBe(
      true
    );
    expect(wrap.props.style == null || wrap.props.style.elevation == null).toBe(
      true
    );
    const input = getByTestId('kotc-bottom-text-input');
    expect(input.props.placeholder).toBe('Bottom text');
    expect(input.props.className).toMatch(/text-3xl/);
    expect(input.props.className).toMatch(/text-center/);
    expect(input.props.className).toMatch(/pb-\[4px\]/);
    expect(input.props.className).toMatch(/outline-none/);
    expect(input.props.className).toMatch(/focus:border-gray-50/);

    fireEvent.changeText(input, 'Short');
    fireEvent(input, 'submitEditing');
    await waitFor(() =>
      expect(getByTestId('kotc-bottom-text-input').props.value).toBe(
        'King of the Court Live Session'
      )
    );
    expect(mockRunKotc).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'rename_bottom_text' })
    );

    fireEvent.changeText(
      getByTestId('kotc-bottom-text-input'),
      'Valid Renamed Bottom Text XX'
    );
    fireEvent(getByTestId('kotc-bottom-text-input'), 'submitEditing');
    expect(mockRunKotc).toHaveBeenCalledWith({
      type: 'rename_bottom_text',
      bottom_text: 'Valid Renamed Bottom Text XX',
    });

    fireEvent.changeText(
      getByTestId('kotc-bottom-text-input'),
      'Draft bottom that is long enough'
    );
    fireEvent(getByTestId('kotc-bottom-text-input'), 'blur');
    await waitFor(() =>
      expect(getByTestId('kotc-bottom-text-input').props.value).toBe(
        'King of the Court Live Session'
      )
    );
  });

  it('bottom text footer clears on unmount', async () => {
    let last: React.ReactNode | undefined = undefined;
    const { unmount } = render(
      <FooterHost
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
    let calls = 0;
    let setBump: ((n: number) => void) | undefined;
    function Host() {
      const [, bump] = React.useState(0);
      setBump = bump;
      const [footer, setFooter] = React.useState<React.ReactNode | null>(null);
      return (
        <>
          <KotcLivePanel
            sessionId={1}
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
      expect(getByTestId('kotc-bottom-text-input')).toBeTruthy()
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
    const { getByTestId, queryByPlaceholderText } = render(<FooterHost />);
    await waitFor(() =>
      expect(getByTestId('kotc-bottom-text-input')).toBeTruthy()
    );
    expect(getByTestId('kotc-bottom-text-input').props.children).toBe(
      'King of the Court Live Session'
    );
    expect(getByTestId('kotc-bottom-text-input').props.className).toMatch(
      /text-3xl/
    );
    expect(getByTestId('kotc-bottom-text-input').props.className).toMatch(
      /text-center/
    );
    expect(getByTestId('kotc-bottom-text-input').props.className).toMatch(
      /pb-\[4px\]/
    );
    expect(queryByPlaceholderText('Bottom text')).toBeNull();
    liveBase.session.status = 'active';
  });

  it('duplicate_active flashes waiting target', async () => {
    mockRunKotc.mockResolvedValue({
      code: 'duplicate_active',
      duplicate: { id: '10', location: 'waiting' },
    });
    const { getByTestId } = render(<KotcLivePanel sessionId={1} />);
    const add = getByTestId('kotc-add-team-input');
    fireEvent.changeText(add, 'Long Enough Team Name');
    fireEvent(add, 'submitEditing');
    await waitFor(() => {
      expect(getByTestId('kotc-waiting-10').props.className).toMatch(
        /border-red-500/
      );
    });
  });

  it('shows winner and return when court full and active', async () => {
    liveBase.court_count = 2;
    liveBase.court = {
      team_a: {
        team_id: 'a',
        team_name: 'Team Alpha One',
        biggest_streak: 1,
      },
      team_b: {
        team_id: 'b',
        team_name: 'Team Bravo Two',
        biggest_streak: 0,
      },
    };
    const { getByTestId } = render(<KotcLivePanel sessionId={1} />);
    expect(getByTestId('kotc-winner-a')).toBeTruthy();
    expect(getByTestId('kotc-winner-b')).toBeTruthy();
    expect(getByTestId('kotc-return-a')).toBeTruthy();
    expect(getByTestId('kotc-return-b')).toBeTruthy();
  });

  it('shows return without winner when only one court slot filled', async () => {
    liveBase.court_count = 1;
    liveBase.court = {
      team_a: {
        team_id: 'a',
        team_name: 'Team Alpha One',
        biggest_streak: 2,
      },
      team_b: null,
    };
    const { getByTestId, queryByTestId } = render(
      <KotcLivePanel sessionId={1} />
    );
    expect(getByTestId('kotc-return-a')).toBeTruthy();
    expect(queryByTestId('kotc-winner-a')).toBeNull();
  });

  it('disables return when waiting is full', async () => {
    liveBase.court_count = 1;
    liveBase.court = {
      team_a: {
        team_id: 'a',
        team_name: 'Team Alpha One',
        biggest_streak: 0,
      },
      team_b: null,
    };
    liveBase.waiting = Array.from({ length: 6 }, (_, i) => ({
      participation_id: `p${i}`,
      team_id: String(i),
      team_name: `Waiting Team ${i}`,
      biggest_streak: 0,
      second_biggest_streak: 0,
      queue_position: i + 1,
    }));
    const { getByTestId } = render(<KotcLivePanel sessionId={1} />);
    expect(getByTestId('kotc-return-a').props.accessibilityState.disabled).toBe(
      true
    );
  });

  it('return and requeue dispatch locked commands', async () => {
    liveBase.court_count = 1;
    liveBase.court = {
      team_a: {
        team_id: 'a',
        team_name: 'Team Alpha One',
        biggest_streak: 0,
      },
      team_b: null,
    };
    liveBase.leaderboard = [
      {
        position: 1,
        team_id: 'z',
        team_name: 'Removed Team',
        biggest_streak: 3,
        second_biggest_streak: 0,
        slot: 'removed',
      },
    ];
    const { getByTestId } = render(<KotcLivePanel sessionId={1} />);
    fireEvent.press(getByTestId('kotc-return-a'));
    expect(mockRunKotc).toHaveBeenCalledWith({
      type: 'return_to_waiting',
      teamId: 'a',
    });
    fireEvent.press(getByTestId('kotc-requeue-z'));
    expect(mockRunKotc).toHaveBeenCalledWith({
      type: 'requeue',
      teamId: 'z',
    });
  });

  it('court and waiting stats use LB rank not queue', async () => {
    liveBase.court_count = 1;
    liveBase.court = {
      team_a: {
        team_id: 'a',
        team_name: 'Team Alpha One',
        biggest_streak: 4,
      },
      team_b: null,
    };
    liveBase.waiting = [
      {
        participation_id: 'p1',
        team_id: '10',
        team_name: 'Alpha Squad',
        biggest_streak: 2,
        second_biggest_streak: 0,
        queue_position: 1,
      },
    ];
    liveBase.leaderboard = [
      {
        position: 3,
        team_id: 'a',
        team_name: 'Team Alpha One',
        biggest_streak: 4,
        second_biggest_streak: 0,
        slot: 'court_a',
      },
      {
        position: 5,
        team_id: '10',
        team_name: 'Alpha Squad',
        biggest_streak: 2,
        second_biggest_streak: 0,
        slot: 'waiting',
      },
    ];
    const { getByTestId, getByText, queryByText } = render(
      <KotcLivePanel sessionId={1} />
    );
    expect(getByText(/#3 · Best: 4 streak wins/)).toBeTruthy();
    expect(getByText(/#5 · Best: 2 streak wins/)).toBeTruthy();
    expect(queryByText(/#1 ·/)).toBeNull();
    expect(getByTestId('kotc-waiting-10')).toBeTruthy();
  });

  it('hides LB requeue for waiting/court slots', async () => {
    liveBase.leaderboard = [
      {
        position: 1,
        team_id: '10',
        team_name: 'Alpha Squad',
        biggest_streak: 1,
        second_biggest_streak: 0,
        slot: 'waiting',
      },
      {
        position: 2,
        team_id: 'a',
        team_name: 'On Court',
        biggest_streak: 1,
        second_biggest_streak: 0,
        slot: 'court_a',
      },
    ];
    liveBase.court = {
      team_a: {
        team_id: 'a',
        team_name: 'On Court',
        biggest_streak: 1,
      },
      team_b: null,
    };
    liveBase.court_count = 1;
    const { queryByTestId } = render(<KotcLivePanel sessionId={1} />);
    expect(queryByTestId('kotc-requeue-10')).toBeNull();
    expect(queryByTestId('kotc-requeue-a')).toBeNull();
  });

  it('waiting row shows em dash when team has no stats', async () => {
    liveBase.leaderboard = [];
    const { getByText } = render(<KotcLivePanel sessionId={1} />);
    await waitFor(() => expect(getByText('—')).toBeTruthy());
  });

  it('completed session shows plain title text', async () => {
    liveBase.session.status = 'completed';
    const { queryByTestId, getByText } = render(<KotcLivePanel sessionId={1} />);
    expect(queryByTestId('kotc-rename-input')).toBeNull();
    expect(
      getByText('King of the Court Live Session').props.className
    ).toMatch(/text-5xl/);
  });
});
