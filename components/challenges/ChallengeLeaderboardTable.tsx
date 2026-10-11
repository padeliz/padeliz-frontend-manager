import ActionButton from '@/components/ui/ActionButton';
import TablePagination from '@/components/ui/TablePagination';
import {
  CHALLENGE_ICONS,
  CHALLENGE_ROW_ICON_SIZE,
} from '@/constants/challengeIcons';
import {
  LEADERBOARD_BODY_FONT_SIZE,
  LEADERBOARD_BODY_TEXT_STYLE,
  LEADERBOARD_HEADER_HEIGHT,
  LEADERBOARD_HEADER_TEXT_STYLE,
  LEADERBOARD_PAGE_SIZE,
  LEADERBOARD_ROW_HEIGHT,
} from '@/constants/challengeLeaderboard';
import { useLocalPagination } from '@/hooks/useLocalPagination';
import { formatRecordHoldCell } from '@/utils/challengeUtils';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

export type ChallengeLeaderboardColumn<T> = {
  key: string;
  label: string;
  flex?: number;
  render: (row: T) => React.ReactNode;
};

type Props<T extends { [key: string]: unknown }> = {
  rows: T[];
  columns: ChallengeLeaderboardColumn<T>[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  testID?: string;
  defaultPerPage?: number;
  pageSizeOptions?: number[];
  renderRowActions?: (row: T) => React.ReactNode;
};

function RequeueAction({
  testID,
  waitingFull,
  onPress,
}: {
  testID: string;
  waitingFull: boolean;
  onPress: () => void;
}) {
  return (
    <View
      testID={`${testID}-wrap`}
      className={`opacity-100 web:opacity-0 web:group-hover:opacity-100 ${
        waitingFull ? 'opacity-40' : ''
      }`}
    >
      <ActionButton
        testID={testID}
        startIcon={CHALLENGE_ICONS.requeue.name}
        iconColor={CHALLENGE_ICONS.requeue.color}
        iconSize={CHALLENGE_ROW_ICON_SIZE}
        iconOnly
        className="px-1"
        disabledStyle="opacity"
        accessibilityLabel="Requeue"
        disabled={waitingFull}
        onPress={onPress}
      />
    </View>
  );
}

export function ChallengeLeaderboardTable<T extends { [key: string]: unknown }>({
  rows,
  columns,
  rowKey,
  emptyMessage = 'No entries yet',
  testID,
  defaultPerPage = LEADERBOARD_PAGE_SIZE,
  pageSizeOptions = [10, 25, 50, 100],
  renderRowActions,
}: Props<T>) {
  const { pageItems, pagination } = useLocalPagination(rows, {
    defaultPerPage,
  });

  const allColumns = useMemo(() => {
    if (!renderRowActions) return columns;
    return [
      ...columns,
      {
        key: '__actions',
        label: '',
        flex: 0.4,
        render: (row: T) => renderRowActions(row),
      } satisfies ChallengeLeaderboardColumn<T>,
    ];
  }, [columns, renderRowActions]);

  return (
    <View testID={testID}>
      <View className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <View
          className="flex-row bg-gray-100 border-b border-gray-200 box-border"
          style={{ height: LEADERBOARD_HEADER_HEIGHT }}
          testID={`${testID}-header`}
        >
          {allColumns.map(col => (
            <View
              key={col.key}
              className="px-3 justify-center"
              style={{ flex: col.flex ?? 1 }}
            >
              <Text
                className="font-semibold text-gray-600"
                style={LEADERBOARD_HEADER_TEXT_STYLE}
              >
                {col.label}
              </Text>
            </View>
          ))}
        </View>
        {pageItems.length === 0 ? (
          <Text className="text-base text-gray-500 p-3">{emptyMessage}</Text>
        ) : (
          pageItems.map((row, index) => (
            <Animated.View
              key={rowKey(row)}
              layout={LinearTransition}
              className={`group flex-row border-b border-gray-100 box-border${
                index % 2 === 0 ? ' bg-gray-50' : ''
              }`}
              style={{ height: LEADERBOARD_ROW_HEIGHT }}
              testID={`${testID}-row-${rowKey(row)}`}
            >
              {allColumns.map(col => {
                const cell = col.render(row);
                return (
                  <View
                    key={col.key}
                    className="px-3 justify-center"
                    style={{ flex: col.flex ?? 1 }}
                  >
                    {typeof cell === 'string' || typeof cell === 'number' ? (
                      cell === '' ? null : (
                        <Text
                          className="text-gray-800"
                          style={LEADERBOARD_BODY_TEXT_STYLE}
                        >
                          {cell}
                        </Text>
                      )
                    ) : (
                      cell
                    )}
                  </View>
                );
              })}
            </Animated.View>
          ))
        )}
      </View>
      <TablePagination
        {...pagination}
        pageSizeOptions={pageSizeOptions}
        variant="navigation"
        hideWhenSinglePage
      />
    </View>
  );
}

export type KotcLeaderboardRow = {
  position: number;
  team_id: string;
  team_name: string;
  biggest_streak: number;
  second_biggest_streak: number;
  slot?: string;
};

export function KotcLeaderboardTable({
  rows,
  renderRowActions,
  waitingFull = false,
  onRequeue,
  readOnly = false,
}: {
  rows: KotcLeaderboardRow[];
  renderRowActions?: (row: KotcLeaderboardRow) => React.ReactNode;
  waitingFull?: boolean;
  onRequeue?: (teamId: string) => void;
  readOnly?: boolean;
}) {
  const showOther = useMemo(
    () => rows.some(r => (r.second_biggest_streak ?? 0) > 0),
    [rows]
  );

  const columns = useMemo(() => {
    const cols: ChallengeLeaderboardColumn<KotcLeaderboardRow>[] = [
      {
        key: 'position',
        label: '#',
        flex: 0.4,
        render: r => String(r.position),
      },
      {
        key: 'team',
        label: 'Team',
        flex: 2,
        render: r => (
          <View className="flex-row items-center gap-1">
            {r.position === 1 ? (
              <View testID={`kotc-leaderboard-star-${r.team_id}`}>
                <Ionicons
                  name={CHALLENGE_ICONS.star.name}
                  size={LEADERBOARD_BODY_FONT_SIZE}
                  color={CHALLENGE_ICONS.star.color}
                />
              </View>
            ) : null}
            <Text
              className="text-gray-800 flex-1"
              style={LEADERBOARD_BODY_TEXT_STYLE}
              numberOfLines={1}
            >
              {r.team_name}
            </Text>
          </View>
        ),
      },
      {
        key: 'best',
        label: 'Best Streak',
        flex: 1,
        render: r => String(r.biggest_streak),
      },
    ];
    if (showOther) {
      cols.push({
        key: 'other',
        label: 'Other Streak',
        flex: 1,
        render: r =>
          (r.second_biggest_streak ?? 0) > 0
            ? String(r.second_biggest_streak)
            : '',
      });
    }
    return cols;
  }, [showOther]);

  const actions =
    renderRowActions ??
    (onRequeue && !readOnly
      ? (row: KotcLeaderboardRow) => {
          if (row.slot !== 'removed') return null;
          return (
            <RequeueAction
              testID={`kotc-requeue-${row.team_id}`}
              waitingFull={waitingFull}
              onPress={() => onRequeue(row.team_id)}
            />
          );
        }
      : undefined);

  return (
    <ChallengeLeaderboardTable
      testID="kotc-leaderboard-table"
      rows={rows}
      columns={columns}
      rowKey={r => r.team_id}
      renderRowActions={actions}
    />
  );
}

export type SmashLeaderboardRow = {
  position: number;
  player_user_id: string;
  player_name: string;
  session_tries: number;
  record_hold_seconds: number;
  is_record_holder: boolean;
  slot?: string;
};

export function SmashLeaderboardTable({
  rows,
  renderRowActions,
  waitingFull = false,
  onRequeue,
  readOnly = false,
}: {
  rows: SmashLeaderboardRow[];
  renderRowActions?: (row: SmashLeaderboardRow) => React.ReactNode;
  waitingFull?: boolean;
  onRequeue?: (playerId: string) => void;
  readOnly?: boolean;
}) {
  const showRecordHolding = useMemo(
    () =>
      rows.some(
        r => r.is_record_holder || (r.record_hold_seconds ?? 0) > 0
      ),
    [rows]
  );

  const columns = useMemo(() => {
    const cols: ChallengeLeaderboardColumn<SmashLeaderboardRow>[] = [
      {
        key: 'position',
        label: '#',
        flex: 0.4,
        render: r => String(r.position),
      },
      {
        key: 'player',
        label: 'Player',
        flex: 2,
        render: r => (
          <View className="flex-row items-center gap-1">
            {r.is_record_holder ? (
              <View testID={`smash-leaderboard-star-${r.player_user_id}`}>
                <Ionicons
                  name={CHALLENGE_ICONS.star.name}
                  size={LEADERBOARD_BODY_FONT_SIZE}
                  color={CHALLENGE_ICONS.star.color}
                />
              </View>
            ) : null}
            <Text
              className="text-gray-800 flex-1"
              style={LEADERBOARD_BODY_TEXT_STYLE}
              numberOfLines={1}
            >
              {r.player_name}
            </Text>
          </View>
        ),
      },
      {
        key: 'tries',
        label: 'Tries',
        flex: 0.8,
        render: r => String(r.session_tries),
      },
    ];
    if (showRecordHolding) {
      cols.push({
        key: 'hold',
        label: 'Record Holding',
        flex: 1,
        render: r => formatRecordHoldCell(r.record_hold_seconds),
      });
    }
    return cols;
  }, [showRecordHolding]);

  const actions =
    renderRowActions ??
    (onRequeue && !readOnly
      ? (row: SmashLeaderboardRow) => {
          if (row.slot !== 'removed') return null;
          return (
            <RequeueAction
              testID={`smash-requeue-${row.player_user_id}`}
              waitingFull={waitingFull}
              onPress={() => onRequeue(row.player_user_id)}
            />
          );
        }
      : undefined);

  return (
    <ChallengeLeaderboardTable
      testID="smash-leaderboard-table"
      rows={rows}
      columns={columns}
      rowKey={r => r.player_user_id}
      renderRowActions={actions}
    />
  );
}
