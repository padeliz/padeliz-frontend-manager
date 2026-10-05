import { KotcLeaderboardTable } from '@/components/challenges/ChallengeLeaderboardTable';
import ChallengeBrandingSection from '@/components/challenges/ChallengeBrandingSection';
import ChallengeSyncStatusBadge from '@/components/challenges/ChallengeSyncStatusBadge';
import SortableRow, {
  SortableDragHandle,
} from '@/components/events/SortableRow';
import ActionButton from '@/components/ui/ActionButton';
import Tooltip from '@/components/ui/Tooltip';
import {
  CHALLENGE_COORDINATOR_LOGO_MAX_HEIGHT,
  CHALLENGE_COORDINATOR_LOGOS,
  CHALLENGE_PRIZE_PARTNER_LOGO_MAX_HEIGHT,
  CHALLENGE_PRIZE_PARTNER_ROWS,
} from '@/constants/challengeBranding';
import {
  CHALLENGE_HEADER_ICON_SIZE,
  CHALLENGE_ICONS,
  CHALLENGE_ROW_ICON_SIZE,
} from '@/constants/challengeIcons';
import { useChallengeSession } from '@/hooks/useChallengeSession';
import {
  SESSION_TITLE_MAX,
  WAITING_MAX,
  validateSessionBottomText,
  validateSessionTitle,
} from '@/lib/challenges/nameRules';
import {
  formatKotcTeamStats,
  kotcCourtSlotLabel,
  validateChallengeTeamName,
  CHALLENGE_TEAM_MAX,
} from '@/utils/challengeUtils';
import AppTextInput from '@/components/ui/AppTextInput';
import ChallengeLiveBottomTextFooter from '@/components/challenges/ChallengeLiveBottomTextFooter';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Text,
  View,
} from 'react-native';

type Props = {
  sessionId: number;
  onFooterReady?: (node: React.ReactNode | null) => void;
};

const WAITING_ROW_HEIGHT = 72;
const DUPLICATE_FLASH_MS = 2000;

export default function KotcLivePanel({ sessionId, onFooterReady }: Props) {
  const { live, loading, error, runKotc, undo, syncBadge } =
    useChallengeSession(sessionId);
  const [teamName, setTeamName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameBottomText, setRenameBottomText] = useState('');
  const [addInputError, setAddInputError] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const readOnly = live?.session.status === 'completed';
  const canMutate = !readOnly;
  const waitingFull = (live?.waiting.length ?? 0) >= WAITING_MAX;

  useEffect(() => {
    if (live?.session.title) setRenameTitle(live.session.title);
  }, [live?.session.title]);

  useEffect(() => {
    if (live?.session.bottom_text) setRenameBottomText(live.session.bottom_text);
  }, [live?.session.bottom_text]);

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  const flashDuplicate = useCallback((id: string) => {
    setAddInputError(true);
    setFlashId(id);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => {
      setFlashId(null);
      setAddInputError(false);
    }, DUPLICATE_FLASH_MS);
  }, []);

  const clearDuplicateFlash = useCallback(() => {
    setAddInputError(false);
    setFlashId(null);
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  const saveTitle = useCallback(() => {
    if (!live || readOnly) return;
    const trimmed = renameTitle.trim();
    if (trimmed === live.session.title) return;
    const err = validateSessionTitle(trimmed);
    if (err) {
      setRenameTitle(live.session.title);
      return;
    }
    void runKotc({ type: 'rename', title: trimmed });
  }, [live, readOnly, renameTitle, runKotc]);

  const saveBottomText = useCallback(() => {
    if (!live || readOnly) return;
    const trimmed = renameBottomText.trim();
    if (trimmed === live.session.bottom_text) return;
    const err = validateSessionBottomText(trimmed);
    if (err) {
      setRenameBottomText(live.session.bottom_text);
      return;
    }
    void runKotc({ type: 'rename_bottom_text', bottom_text: trimmed });
  }, [live, readOnly, renameBottomText, runKotc]);

  const onFooterReadyRef = useRef(onFooterReady);
  onFooterReadyRef.current = onFooterReady;
  const saveBottomTextRef = useRef(saveBottomText);
  saveBottomTextRef.current = saveBottomText;
  const bottomTextValue = readOnly
    ? (live?.session.bottom_text ?? '')
    : renameBottomText;
  const savedBottomText = live?.session.bottom_text ?? '';
  const hasLive = live != null;

  useEffect(() => {
    const notify = onFooterReadyRef.current;
    if (!notify) return;
    if (!hasLive) {
      notify(null);
      return;
    }
    notify(
      <ChallengeLiveBottomTextFooter
        value={bottomTextValue}
        readOnly={readOnly}
        onChangeText={setRenameBottomText}
        onSubmitEditing={() => saveBottomTextRef.current()}
        onBlur={() => setRenameBottomText(savedBottomText)}
        testID="kotc-bottom-text-input"
      />
    );
  }, [hasLive, readOnly, bottomTextValue, savedBottomText]);

  useEffect(() => {
    return () => {
      onFooterReadyRef.current?.(null);
    };
  }, []);

  const addTeam = useCallback(async () => {
    if (!canMutate || waitingFull) return;
    const err = validateChallengeTeamName(teamName);
    if (err) {
      setNameError(err);
      return;
    }
    setNameError(null);
    const result = await runKotc({ type: 'add_team', name: teamName.trim() });
    if (result?.code === 'duplicate_active' && result.duplicate) {
      flashDuplicate(result.duplicate.id);
      return;
    }
    setTeamName('');
    clearDuplicateFlash();
  }, [
    canMutate,
    waitingFull,
    teamName,
    runKotc,
    flashDuplicate,
    clearDuplicateFlash,
  ]);

  if (loading || !live) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const court = live.court as {
    team_a: {
      team_id: string;
      team_name: string;
      biggest_streak: number;
    } | null;
    team_b: {
      team_id: string;
      team_name: string;
      biggest_streak: number;
    } | null;
  };
  const vacantSlot: 'court_a' | 'court_b' | null = !court.team_a
    ? 'court_a'
    : !court.team_b
      ? 'court_b'
      : null;

  const completeBlocked =
    !live.can_complete && live.complete_blocked_reasons.length > 0;
  const completeTooltip = completeBlocked
    ? live.complete_blocked_reasons.join('; ')
    : '';

  const leaderboard = live.leaderboard as Array<{
    position: number;
    team_id: string;
    team_name: string;
    biggest_streak: number;
    second_biggest_streak: number;
    slot?: string;
  }>;

  const lbPositionById = new Map(
    leaderboard.map(row => [row.team_id, row.position])
  );

  const completeButton = (
    <ActionButton
      label="Complete"
      startIcon={CHALLENGE_ICONS.complete.name}
      iconOnly
      disabledStyle="mute"
      iconColor={CHALLENGE_ICONS.complete.color}
      iconSize={CHALLENGE_HEADER_ICON_SIZE}
      accessibilityLabel="Complete"
      disabled={!canMutate || !live.can_complete}
      onPress={() => void runKotc({ type: 'complete' })}
      testID="kotc-complete"
    />
  );

  return (
    <View className="flex-1 px-4 pt-4 pb-0 gap-4" testID="kotc-live-panel">
      {error ? (
        <Text className="text-red-600 text-sm" testID="kotc-error">
          {error}
        </Text>
      ) : null}

      <View
        className="flex-row flex-wrap gap-2 items-end"
        testID="kotc-title-row"
      >
        {readOnly ? (
          <Text className="text-5xl font-semibold flex-1">
            {live.session.title}
          </Text>
        ) : (
          <AppTextInput
            testID="kotc-rename-input"
            value={renameTitle}
            onChangeText={setRenameTitle}
            onSubmitEditing={saveTitle}
            onBlur={() => setRenameTitle(live.session.title)}
            maxLength={SESSION_TITLE_MAX}
            placeholder="Session title"
            className="flex-1 text-5xl font-semibold px-0 pt-0 pb-0 bg-transparent border border-transparent outline-none focus:border-gray-50"
          />
        )}
        <ChallengeSyncStatusBadge badge={syncBadge} />
        {readOnly ? (
          <ActionButton
            label="Reactivate"
            variant="primary"
            onPress={() => void runKotc({ type: 'reactivate' })}
            testID="kotc-reactivate"
          />
        ) : (
          <>
            <ActionButton
              label="Undo"
              startIcon={CHALLENGE_ICONS.undo.name}
              iconOnly
              disabledStyle="mute"
              iconColor={CHALLENGE_ICONS.undo.color}
              iconSize={CHALLENGE_HEADER_ICON_SIZE}
              accessibilityLabel="Undo"
              disabled={!canMutate}
              onPress={() => void undo()}
              testID="kotc-undo"
            />
            {completeTooltip ? (
              <Tooltip content={completeTooltip}>{completeButton}</Tooltip>
            ) : (
              completeButton
            )}
          </>
        )}
      </View>

      <View
        className="flex-1 flex-col lg:flex-row gap-4"
        testID="kotc-live-columns"
      >
        <View className="flex-1 lg:flex-[2] gap-4" testID="kotc-live-col-left">
          <View className="bg-white border border-gray-200 rounded-lg p-4">
            <Text className="font-semibold mb-2">In the Court</Text>
            <View className="flex-row gap-4">
              {(['team_a', 'team_b'] as const).map(slot => {
                const team = court[slot];
                const flashing = team && flashId === team.team_id;
                return (
                  <View key={slot} className="flex-1">
                    <Text className="text-xs text-gray-500 mb-1">
                      {kotcCourtSlotLabel(slot)}
                    </Text>
                    <View
                      className={`group border rounded p-3 ${
                        flashing
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-100'
                      }`}
                      testID={
                        team
                          ? `kotc-court-${team.team_id}`
                          : `kotc-court-${slot}-vacant`
                      }
                    >
                      {team ? (
                        <>
                          <View className="flex-row items-center gap-2">
                            <Text
                              className="text-2xl font-medium flex-1"
                              numberOfLines={1}
                            >
                              {team.team_name}
                            </Text>
                            {!readOnly ? (
                              <View className="flex-row gap-1 opacity-100 web:opacity-0 web:group-hover:opacity-100">
                                {live.court_count === 2 ? (
                                  <ActionButton
                                    testID={`kotc-winner-${team.team_id}`}
                                    startIcon={CHALLENGE_ICONS.trophy.name}
                                    iconColor={CHALLENGE_ICONS.trophy.color}
                                    iconSize={CHALLENGE_ROW_ICON_SIZE}
                                    iconOnly
                                    className="px-1"
                                    disabledStyle="opacity"
                                    accessibilityLabel="Declare winner"
                                    onPress={() =>
                                      void runKotc({
                                        type: 'resolve_match',
                                        winnerTeamId: team.team_id,
                                      })
                                    }
                                  />
                                ) : null}
                                <ActionButton
                                  testID={`kotc-return-${team.team_id}`}
                                  startIcon={CHALLENGE_ICONS.returnToWaiting.name}
                                  iconColor={CHALLENGE_ICONS.returnToWaiting.color}
                                  iconSize={CHALLENGE_ROW_ICON_SIZE}
                                  iconOnly
                                  className="px-1"
                                  disabledStyle="opacity"
                                  accessibilityLabel="Return to waiting"
                                  disabled={waitingFull}
                                  onPress={() =>
                                    void runKotc({
                                      type: 'return_to_waiting',
                                      teamId: team.team_id,
                                    })
                                  }
                                />
                              </View>
                            ) : null}
                          </View>
                          <Text className="text-sm text-gray-600 mt-1">
                            {formatKotcTeamStats({
                              leaderboardPosition: lbPositionById.get(
                                team.team_id
                              ),
                              biggestStreak: team.biggest_streak,
                            })}
                          </Text>
                        </>
                      ) : (
                        <Text className="text-2xl font-medium text-gray-400">
                          ...
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View className="bg-white border border-gray-200 rounded-lg p-4">
            <Text className="font-semibold mb-2">Waiting</Text>
            {!readOnly ? (
              <View className="mb-3">
                <AppTextInput
                  testID="kotc-add-team-input"
                  value={teamName}
                  onChangeText={v => {
                    setTeamName(v);
                    setNameError(null);
                    clearDuplicateFlash();
                  }}
                  onSubmitEditing={() => void addTeam()}
                  placeholder="Add team name"
                  maxLength={CHALLENGE_TEAM_MAX}
                  editable={canMutate && !waitingFull}
                  className={`border rounded-lg px-3 py-2 bg-white outline-none ${
                    addInputError ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </View>
            ) : null}
            {nameError ? (
              <Text className="text-red-600 text-sm mb-2">{nameError}</Text>
            ) : null}

            {live.waiting.map((w, index) => {
              const row = w as {
                participation_id: string;
                team_id: string;
                team_name: string;
                biggest_streak: number;
                second_biggest_streak: number;
                queue_position: number;
              };
              const flashing = flashId === row.team_id;
              return (
                <SortableRow
                  key={row.participation_id}
                  index={index}
                  count={live.waiting.length}
                  locked={readOnly || live.waiting.length < 2}
                  activationMode="handle"
                  rowHeight={WAITING_ROW_HEIGHT}
                  onReorder={(from, to) =>
                    void runKotc({
                      type: 'reorder_waiting',
                      fromIndex: from,
                      toIndex: to,
                    })
                  }
                >
                  <View
                    className={`group border rounded p-3 mb-2 ${
                      flashing
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-100'
                    }`}
                    testID={`kotc-waiting-${row.team_id}`}
                  >
                    <View className="flex-row items-center">
                      {!readOnly ? (
                        <SortableDragHandle
                          testID={`kotc-drag-${row.team_id}`}
                        />
                      ) : null}
                      <View className="flex-1">
                        <View className="flex-row items-center">
                          <Text
                            className="text-2xl font-medium flex-1"
                            numberOfLines={1}
                          >
                            {row.team_name}
                          </Text>
                          {!readOnly ? (
                            <View className="flex-row gap-2 opacity-100 web:opacity-0 web:group-hover:opacity-100">
                              {live.can_manual_jump_in && vacantSlot ? (
                                <ActionButton
                                  testID={`kotc-jump-in-${row.team_id}`}
                                  startIcon={CHALLENGE_ICONS.jumpIn.name}
                                  iconColor={CHALLENGE_ICONS.jumpIn.color}
                                  iconSize={CHALLENGE_ROW_ICON_SIZE}
                                  iconOnly
                                  className="px-1"
                                  disabledStyle="opacity"
                                  accessibilityLabel="Jump in"
                                  onPress={() =>
                                    void runKotc({
                                      type: 'jump_in',
                                      teamId: row.team_id,
                                      slot: vacantSlot,
                                    })
                                  }
                                />
                              ) : null}
                              <ActionButton
                                testID={`kotc-remove-${row.team_id}`}
                                startIcon={CHALLENGE_ICONS.remove.name}
                                iconColor={CHALLENGE_ICONS.remove.color}
                                iconSize={CHALLENGE_ROW_ICON_SIZE}
                                iconOnly
                                className="px-1"
                                disabledStyle="opacity"
                                accessibilityLabel="Remove"
                                onPress={() =>
                                  void runKotc({
                                    type: 'remove_team',
                                    teamId: row.team_id,
                                  })
                                }
                              />
                            </View>
                          ) : null}
                        </View>
                        <Text className="text-sm text-gray-600">
                          {formatKotcTeamStats({
                            leaderboardPosition: lbPositionById.get(
                              row.team_id
                            ),
                            biggestStreak: row.biggest_streak,
                          })}
                        </Text>
                      </View>
                    </View>
                  </View>
                </SortableRow>
              );
            })}
          </View>

          <ChallengeBrandingSection
            title="Coordinators"
            rows={[CHALLENGE_COORDINATOR_LOGOS]}
            logoMaxHeight={CHALLENGE_COORDINATOR_LOGO_MAX_HEIGHT}
            logoAlign="start"
            testID="kotc-coordinators"
          />
        </View>

        <View className="flex-1 lg:flex-[3] gap-4" testID="kotc-live-col-right">
          <ChallengeBrandingSection
            title="Prize Partners"
            rows={CHALLENGE_PRIZE_PARTNER_ROWS}
            logoMaxHeight={CHALLENGE_PRIZE_PARTNER_LOGO_MAX_HEIGHT}
            logoAlign="center"
            rowsGapClassName="gap-4"
            logoGapClassName="gap-5"
            testID="kotc-prize-partners"
          />
          <View
            className="bg-white border border-gray-200 rounded-lg p-4"
            testID="kotc-leaderboard-section"
          >
            <Text className="font-semibold mb-2">Leaderboard</Text>
            <KotcLeaderboardTable
              rows={leaderboard}
              waitingFull={waitingFull}
              readOnly={readOnly}
              onRequeue={teamId =>
                void runKotc({ type: 'requeue', teamId })
              }
            />
          </View>
        </View>
      </View>
    </View>
  );
}
