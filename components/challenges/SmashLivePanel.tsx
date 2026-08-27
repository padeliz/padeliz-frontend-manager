import { SmashLeaderboardTable } from '@/components/challenges/ChallengeLeaderboardTable';
import ChallengeBrandingSection from '@/components/challenges/ChallengeBrandingSection';
import ChallengeSyncStatusBadge from '@/components/challenges/ChallengeSyncStatusBadge';
import SortableRow, {
  SortableDragHandle,
} from '@/components/editions/SortableRow';
import HeaderActionButton from '@/components/ui/HeaderActionButton';
import IconActionButton from '@/components/ui/IconActionButton';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
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
import { ChallengeSmashAttemptDetail } from '@/types/api/challenge';
import {
  CHALLENGE_PLAYER_MAX,
  formatSmashPlayerStats,
  validateChallengePlayerName,
} from '@/utils/challengeUtils';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppTextInput from '@/components/ui/AppTextInput';
import ChallengeLiveBottomTextFooter from '@/components/challenges/ChallengeLiveBottomTextFooter';
import {
  ActivityIndicator,
  Switch,
  Text,
  View,
} from 'react-native';

type Props = {
  sessionId: number;
  onFooterReady?: (node: React.ReactNode | null) => void;
};

const DETAIL_OPTIONS = [
  { label: '— No detail —', value: '' },
  {
    label: 'Ball came back over the net',
    value: 'ball_over_net' as ChallengeSmashAttemptDetail,
  },
  {
    label: 'Ball came back over service line',
    value: 'ball_over_service_line' as ChallengeSmashAttemptDetail,
  },
  {
    label: 'Ball came back touching back glass',
    value: 'ball_touching_back_glass' as ChallengeSmashAttemptDetail,
  },
];

const WAITING_ROW_HEIGHT = 72;
const DUPLICATE_FLASH_MS = 2000;

export default function SmashLivePanel({ sessionId, onFooterReady }: Props) {
  const { live, loading, error, runSmash, undo, syncBadge } =
    useChallengeSession(sessionId);
  const [playerName, setPlayerName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [gotNewRecord, setGotNewRecord] = useState(false);
  const [detail, setDetail] = useState<string>('');
  const [renameTitle, setRenameTitle] = useState('');
  const [renameBottomText, setRenameBottomText] = useState('');
  const [addInputError, setAddInputError] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
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
    void runSmash({ type: 'rename', title: trimmed });
  }, [live, readOnly, renameTitle, runSmash]);

  const saveBottomText = useCallback(() => {
    if (!live || readOnly) return;
    const trimmed = renameBottomText.trim();
    if (trimmed === live.session.bottom_text) return;
    const err = validateSessionBottomText(trimmed);
    if (err) {
      setRenameBottomText(live.session.bottom_text);
      return;
    }
    void runSmash({ type: 'rename_bottom_text', bottom_text: trimmed });
  }, [live, readOnly, renameBottomText, runSmash]);

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
        testID="smash-bottom-text-input"
      />
    );
  }, [hasLive, readOnly, bottomTextValue, savedBottomText]);

  useEffect(() => {
    return () => {
      onFooterReadyRef.current?.(null);
    };
  }, []);

  const addPlayer = useCallback(async () => {
    if (!canMutate || waitingFull) return;
    const err = validateChallengePlayerName(playerName);
    if (err) {
      setNameError(err);
      return;
    }
    setNameError(null);
    const result = await runSmash({
      type: 'add_player',
      name: playerName.trim(),
    });
    if (result?.code === 'duplicate_active' && result.duplicate) {
      flashDuplicate(result.duplicate.id);
      return;
    }
    setPlayerName('');
    clearDuplicateFlash();
  }, [
    canMutate,
    waitingFull,
    playerName,
    runSmash,
    flashDuplicate,
    clearDuplicateFlash,
  ]);

  const setNewRecord = useCallback((value: boolean) => {
    setGotNewRecord(value);
    if (!value) {
      setDetail('');
      setDetailOpen(false);
    }
  }, []);

  const detailOptions = useMemo(() => DETAIL_OPTIONS, []);

  if (loading || !live) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const court = live.court as {
    participation_id: string;
    player_id: string;
    player_name: string;
    session_tries: number;
    record_hold_seconds: number;
    is_record_holder: boolean;
  } | null;

  const completeBlocked =
    !live.can_complete && live.complete_blocked_reasons.length > 0;
  const completeTooltip = completeBlocked
    ? live.complete_blocked_reasons.join('; ')
    : '';

  const leaderboard = live.leaderboard as Array<{
    position: number;
    player_id: string;
    player_name: string;
    session_tries: number;
    record_hold_seconds: number;
    is_record_holder: boolean;
    slot?: string;
  }>;

  const lbPositionById = new Map(
    leaderboard.map(row => [row.player_id, row.position])
  );

  const completeButton = (
    <HeaderActionButton
      label="Complete"
      icon={CHALLENGE_ICONS.complete.name}
      iconOnly
      iconColor={CHALLENGE_ICONS.complete.color}
      iconSize={CHALLENGE_HEADER_ICON_SIZE}
      accessibilityLabel="Complete"
      disabled={!canMutate || !live.can_complete}
      onPress={() => void runSmash({ type: 'complete' })}
      testID="smash-complete"
    />
  );

  const courtFlashing = court && flashId === court.player_id;
  const courtControlsVisible = detailOpen;

  return (
    <View className="flex-1 px-4 pt-4 pb-0 gap-4" testID="smash-live-panel">
      {error ? (
        <Text className="text-red-600 text-sm" testID="smash-error">
          {error}
        </Text>
      ) : null}
      <View
        className="flex-row flex-wrap gap-2 items-end"
        testID="smash-title-row"
      >
        {readOnly ? (
          <Text className="text-5xl font-semibold flex-1">
            {live.session.title}
          </Text>
        ) : (
          <AppTextInput
            testID="smash-rename-input"
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
          <HeaderActionButton
            label="Reactivate"
            variant="primary"
            onPress={() => void runSmash({ type: 'reactivate' })}
            testID="smash-reactivate"
          />
        ) : (
          <>
            <HeaderActionButton
              label="Undo"
              icon={CHALLENGE_ICONS.undo.name}
              iconOnly
              iconColor={CHALLENGE_ICONS.undo.color}
              iconSize={CHALLENGE_HEADER_ICON_SIZE}
              accessibilityLabel="Undo"
              disabled={!canMutate}
              onPress={() => void undo()}
              testID="smash-undo"
            />
            {completeTooltip ? (
              <Tooltip content={completeTooltip}>{completeButton}</Tooltip>
            ) : (
              completeButton
            )}
          </>
        )}
      </View>

      <View className="flex-1 flex-col lg:flex-row gap-4" testID="smash-live-columns">
        <View className="flex-1 gap-4">
          <View
            className={`group bg-white border rounded-lg p-4 ${
              courtFlashing ? 'border-red-500 bg-red-50' : 'border-gray-200'
            }`}
            testID={
              court ? `smash-court-${court.player_id}` : 'smash-court-vacant'
            }
          >
            <Text className="font-semibold mb-2">In the Court</Text>
            {court ? (
              <>
                <View className="flex-row items-center gap-2">
                  <Text
                    className="text-2xl font-medium flex-1"
                    numberOfLines={1}
                  >
                    {court.player_name}
                  </Text>
                  {!readOnly ? (
                    <View
                      testID="smash-court-controls"
                      className={`flex-row items-center gap-2 flex-shrink ${
                        courtControlsVisible
                          ? 'opacity-100'
                          : 'opacity-100 web:opacity-0 web:group-hover:opacity-100'
                      }`}
                    >
                      <IconActionButton
                        testID={`smash-return-${court.player_id}`}
                        icon={CHALLENGE_ICONS.returnToWaiting.name}
                        color={CHALLENGE_ICONS.returnToWaiting.color}
                        size={CHALLENGE_ROW_ICON_SIZE}
                        accessibilityLabel="Return to waiting"
                        disabled={waitingFull}
                        onPress={() =>
                          void runSmash({
                            type: 'return_to_waiting',
                            playerId: court.player_id,
                          })
                        }
                      />
                      <Switch
                        testID="smash-new-record-toggle"
                        accessibilityLabel="New record"
                        value={gotNewRecord}
                        onValueChange={setNewRecord}
                      />
                      {gotNewRecord ? (
                        <View
                          testID="smash-detail-dropdown"
                          className="max-w-[12rem]"
                        >
                          <SingleSelectDropdown
                            title="Detail"
                            options={detailOptions}
                            selectedValue={detail || null}
                            onSelectionChange={v =>
                              setDetail(v == null ? '' : String(v))
                            }
                            placeholder="Detail"
                            className="max-w-[12rem]"
                            minWidth={80}
                            onOpenChange={setDetailOpen}
                          />
                        </View>
                      ) : null}
                      <IconActionButton
                        testID="smash-record-attempt"
                        icon={
                          gotNewRecord
                            ? CHALLENGE_ICONS.trophy.name
                            : CHALLENGE_ICONS.confirmAttempt.name
                        }
                        color={
                          gotNewRecord
                            ? CHALLENGE_ICONS.trophy.color
                            : CHALLENGE_ICONS.confirmAttempt.color
                        }
                        size={CHALLENGE_ROW_ICON_SIZE}
                        accessibilityLabel={
                          gotNewRecord
                            ? 'Record new record'
                            : 'Confirm attempt'
                        }
                        onPress={() => {
                          void runSmash({
                            type: 'record_attempt',
                            gotNewRecord,
                            detail: (detail ||
                              '') as ChallengeSmashAttemptDetail | '',
                          });
                          setGotNewRecord(false);
                          setDetail('');
                          setDetailOpen(false);
                        }}
                      />
                    </View>
                  ) : null}
                </View>
                <Text className="text-sm text-gray-600 mt-1">
                  {formatSmashPlayerStats({
                    leaderboardPosition: lbPositionById.get(court.player_id),
                    sessionTries: court.session_tries,
                    isRecordHolder: court.is_record_holder,
                  })}
                </Text>
              </>
            ) : (
              <Text className="text-2xl font-medium text-gray-400">...</Text>
            )}
          </View>

          <View className="bg-white border border-gray-200 rounded-lg p-4">
            <Text className="font-semibold mb-2">Waiting</Text>
            {!readOnly ? (
              <View className="mb-3">
                <AppTextInput
                  testID="smash-add-player-input"
                  value={playerName}
                  onChangeText={v => {
                    setPlayerName(v);
                    setNameError(null);
                    clearDuplicateFlash();
                  }}
                  onSubmitEditing={() => void addPlayer()}
                  placeholder="Add player name"
                  maxLength={CHALLENGE_PLAYER_MAX}
                  className={`border rounded-lg px-3 py-2 bg-white outline-none ${
                    addInputError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  editable={canMutate && !waitingFull}
                />
              </View>
            ) : null}
            {nameError ? (
              <Text className="text-red-600 text-sm mb-2">{nameError}</Text>
            ) : null}

            {live.waiting.map((w, index) => {
              const row = w as {
                participation_id: string;
                player_id: string;
                player_name: string;
                session_tries: number;
                record_hold_seconds: number;
                queue_position: number;
                is_record_holder?: boolean;
              };
              const flashing = flashId === row.player_id;
              const lbRow = leaderboard.find(
                l => l.player_id === row.player_id
              );
              return (
                <SortableRow
                  key={row.participation_id}
                  index={index}
                  count={live.waiting.length}
                  locked={readOnly || live.waiting.length < 2}
                  activationMode="handle"
                  rowHeight={WAITING_ROW_HEIGHT}
                  onReorder={(from, to) =>
                    void runSmash({
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
                    testID={`smash-waiting-${row.player_id}`}
                  >
                    <View className="flex-row items-center">
                      {!readOnly ? (
                        <SortableDragHandle
                          testID={`smash-drag-${row.player_id}`}
                        />
                      ) : null}
                      <View className="flex-1">
                        <View className="flex-row items-center">
                          <Text
                            className="text-2xl font-medium flex-1"
                            numberOfLines={1}
                          >
                            {row.player_name}
                          </Text>
                          {!readOnly ? (
                            <View className="flex-row gap-2 opacity-100 web:opacity-0 web:group-hover:opacity-100">
                              {live.can_manual_jump_in ? (
                                <IconActionButton
                                  testID={`smash-jump-in-${row.player_id}`}
                                  icon={CHALLENGE_ICONS.jumpIn.name}
                                  color={CHALLENGE_ICONS.jumpIn.color}
                                  size={CHALLENGE_ROW_ICON_SIZE}
                                  accessibilityLabel="Jump in"
                                  onPress={() =>
                                    void runSmash({
                                      type: 'jump_in',
                                      playerId: row.player_id,
                                    })
                                  }
                                />
                              ) : null}
                              <IconActionButton
                                testID={`smash-remove-${row.player_id}`}
                                icon={CHALLENGE_ICONS.remove.name}
                                color={CHALLENGE_ICONS.remove.color}
                                size={CHALLENGE_ROW_ICON_SIZE}
                                accessibilityLabel="Remove"
                                onPress={() =>
                                  void runSmash({
                                    type: 'remove_player',
                                    playerId: row.player_id,
                                  })
                                }
                              />
                            </View>
                          ) : null}
                        </View>
                        <Text className="text-sm text-gray-600">
                          {formatSmashPlayerStats({
                            leaderboardPosition: lbRow?.position,
                            sessionTries: row.session_tries,
                            isRecordHolder: lbRow?.is_record_holder,
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
            testID="smash-coordinators"
          />
        </View>

        <View className="flex-1 gap-4">
          <ChallengeBrandingSection
            title="Prize Partners"
            rows={CHALLENGE_PRIZE_PARTNER_ROWS}
            logoMaxHeight={CHALLENGE_PRIZE_PARTNER_LOGO_MAX_HEIGHT}
            logoAlign="center"
            rowsGapClassName="gap-4"
            logoGapClassName="gap-5"
            testID="smash-prize-partners"
          />
          <View
            className="bg-white border border-gray-200 rounded-lg p-4"
            testID="smash-leaderboard-section"
          >
            <Text className="font-semibold mb-2">Leaderboard</Text>
            <SmashLeaderboardTable
              rows={leaderboard}
              waitingFull={waitingFull}
              readOnly={readOnly}
              onRequeue={playerId =>
                void runSmash({ type: 'requeue', playerId })
              }
            />
          </View>
        </View>
      </View>
    </View>
  );
}
