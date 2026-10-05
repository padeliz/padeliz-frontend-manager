/**
 * Tools — Templates catalog / metrics + Mode B scratch schedule
 */

import AppLayout from '@/components/layout/AppLayout';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import CachedPdfImageReload from '@/components/events/CachedPdfImageReload';
import SortableRow, {
  reorderList,
  SORTABLE_ROW_HEIGHT,
  SortableDragHandle,
} from '@/components/events/SortableRow';
import AppTextInput from '@/components/ui/AppTextInput';
import AdvancedDataTable from '@/components/ui/AdvancedDataTable';
import ActionButton from '@/components/ui/ActionButton';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import Tooltip from '@/components/ui/Tooltip';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { useCachedPdfAvatarReload } from '@/hooks/useCachedPdfAvatarReload';
import { usePlayerPicker } from '@/hooks/usePlayerPicker';
import { queryKeys } from '@/lib/queryClient';
import { ClubsApiService } from '@/services/api/clubsApi';
import { DivisionsApiService } from '@/services/api/divisionsApi';
import { organizersApi } from '@/services/api/organizersApi';
import { scratchScheduleApi } from '@/services/api/scratchScheduleApi';
import { templatesToolsApi } from '@/services/api/templatesToolsApi';
import { ApiDivision, ApiPlayer } from '@/types/api/entities';
import { SchedulePreview } from '@/types/api/edition';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';

const divisionsApi = new DivisionsApiService();
const clubsApi = new ClubsApiService();

const NO_CLUB = 0;
const NO_ORGANIZER = 0;
const MAX_COURTS = 4;

const COLLECTING_POINTS_TOOLTIP =
  'If player is collecting points from the matches and they appear on the Ranking poster.';

/** Downloads flash a checkmark and fall back to idle; other actions stay sticky. */
const DOWNLOAD_SUCCESS_HOLD_MS = 4000;

function playerDisplayName(player: ApiPlayer): string {
  return (
    player.name ||
    [player.first_name, player.last_name].filter(Boolean).join(' ') ||
    `Player #${player.id_player}`
  );
}

function CourtMatchesPdfButton({
  courtIndex,
  courtName,
  onDownload,
}: {
  courtIndex: number;
  courtName: string;
  onDownload: (courtIndex: number) => Promise<void>;
}) {
  const status = useActionButtonStatus({
    successHoldMs: DOWNLOAD_SUCCESS_HOLD_MS,
  });

  return (
    <ActionButton
      testID={`tools-pdf-matches-${courtIndex}`}
      label={`PDF · ${courtName}`}
      startIcon="download"
      variant="positive"
      size="sm"
      status={status.status}
      errorMessage={status.errorMessage ?? undefined}
      onPress={() => void status.run(() => onDownload(courtIndex))}
    />
  );
}

export default function ToolsTemplatesPage() {
  const reloadStatus = useActionButtonStatus({ successHoldMs: 4000 });
  const previewStatus = useActionButtonStatus();
  const pdfRankingStatus = useActionButtonStatus({
    successHoldMs: DOWNLOAD_SUCCESS_HOLD_MS,
  });
  const {
    spinning: avatarSpinning,
    errors: avatarErrors,
    urlFor: avatarUrlFor,
    reload: reloadAvatar,
  } = useCachedPdfAvatarReload();

  const organizersQuery = useQuery({
    queryKey: queryKeys.organizers(),
    queryFn: async () => {
      const res = await organizersApi.getOrganizers({ per_page: 100 });
      return res.data || [];
    },
  });
  const clubsQuery = useQuery({
    queryKey: queryKeys.clubsPicker(),
    queryFn: async () => {
      const res = await clubsApi.getClubs({ page: 1, per_page: 100 });
      return res.data || [];
    },
  });
  const organizerOptions = useMemo(
    () => [
      { label: 'No organizer', value: NO_ORGANIZER },
      ...(organizersQuery.data || []).map(o => ({
        label: `${o.id_organizer}. ${o.name}`,
        value: o.id_organizer,
      })),
    ],
    [organizersQuery.data]
  );
  const clubOptions = useMemo(
    () => [
      { label: 'No club host', value: NO_CLUB },
      ...(clubsQuery.data || []).map(c => ({
        label: `${c.id_club}. ${c.name}`,
        value: c.id_club,
      })),
    ],
    [clubsQuery.data]
  );
  const [catalog, setCatalog] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [pendingPlayerId, setPendingPlayerId] = useState<number | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<ApiPlayer[]>([]);
  const [collectingPlayerIds, setCollectingPlayerIds] = useState<number[]>([]);
  const [courts, setCourts] = useState<string[]>(['Court 1', 'Court 2']);
  const [courtDraft, setCourtDraft] = useState('');
  const [timeStart, setTimeStart] = useState('10:00');
  const [timeEnd, setTimeEnd] = useState('16:00');
  const [opponents, setOpponents] = useState('3');
  const [repeat, setRepeat] = useState('1');
  const [preview, setPreview] = useState<SchedulePreview | null>(null);
  const [editionName, setEditionName] = useState('');
  const [divisionNamePdf, setDivisionNamePdf] = useState('');
  const [organizerId, setOrganizerId] = useState<number>(NO_ORGANIZER);
  const [clubId, setClubId] = useState<number>(NO_CLUB);
  const [divisions, setDivisions] = useState<ApiDivision[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState<number | null>(
    null
  );
  const [includeFinal, setIncludeFinal] = useState(false);
  const [hasDemonstrative, setHasDemonstrative] = useState(false);
  const [adjust, setAdjust] = useState(0);
  const [activeTab, setActiveTab] = useState<'catalog' | 'modeB'>('modeB');

  const playerPicker = usePlayerPicker({ selectedValue: pendingPlayerId });

  const selectedDivision = useMemo(
    () => divisions.find(d => d.id_division === selectedDivisionId) ?? null,
    [divisions, selectedDivisionId]
  );
  const selectedColor = selectedDivision?.color ?? '#2563eb';

  const divisionOptions = useMemo(
    () =>
      divisions.map(d => ({
        label: `${d.name} (${d.color})`,
        value: d.id_division,
      })),
    [divisions]
  );

  const catalogRows = useMemo(() => {
    const combos = catalog?.combos;
    if (!Array.isArray(combos)) return [];
    return combos.map((c: any, i: number) => ({
      id: i + 1,
      players: c.players ?? c.n ?? '—',
      partners: c.partners ?? c.k ?? '—',
      repeat: c.repeat ?? c.r ?? '—',
      courts: c.courts ?? '—',
      fixed_teams: c.fixed_teams ? 'yes' : 'no',
    }));
  }, [catalog]);

  const metricsRows = useMemo(() => {
    if (!metrics || typeof metrics !== 'object') return [];
    return Object.entries(metrics).map(([key, value], i) => ({
      id: i + 1,
      key,
      value:
        typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''),
    }));
  }, [metrics]);

  const loadTools = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cat, met, divs] = await Promise.all([
        templatesToolsApi.catalog(),
        templatesToolsApi.metrics(),
        divisionsApi.getDivisions({ per_page: 100 }),
      ]);
      setCatalog(cat.data);
      setMetrics(met.data);
      const list = divs.data || [];
      setDivisions(list);
      if (list[0]) {
        setSelectedDivisionId(list[0].id_division);
        setDivisionNamePdf(list[0].name);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load templates tools');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTools().catch(() => {});
  }, [loadTools]);

  const applyDivisionSelection = (divisionId: number) => {
    setSelectedDivisionId(divisionId);
    const division = divisions.find(d => d.id_division === divisionId);
    if (division) {
      setDivisionNamePdf(division.name);
    }
  };

  const addCourt = () => {
    const name = courtDraft.trim();
    if (!name || courts.length >= MAX_COURTS) return;
    if (courts.some(c => c.toLowerCase() === name.toLowerCase())) {
      setCourtDraft('');
      return;
    }
    setCourts(prev => [...prev, name]);
    setCourtDraft('');
  };

  const removeCourt = (index: number) => {
    setCourts(prev => prev.filter((_, i) => i !== index));
  };

  const addPlayerFromPicker = (value: string | number | boolean | null) => {
    if (value == null || value === '') {
      setPendingPlayerId(null);
      return;
    }
    const id = Number(value);
    if (!Number.isFinite(id)) return;

    setSelectedPlayers(prev => {
      if (prev.some(p => p.id_player === id)) {
        return prev;
      }
      const option = playerPicker.options.find(o => Number(o.value) === id);
      const player: ApiPlayer = {
        id_player: id,
        name: option?.label ?? `Player #${id}`,
        first_name: option?.label ?? '',
        last_name: '',
        being_student: false,
        pdf_avatar_url: option?.imageUrl ?? null,
      };
      setCollectingPlayerIds(ids =>
        ids.includes(id) ? ids : [...ids, id]
      );
      return [...prev, player];
    });
    setPendingPlayerId(null);
  };

  const removePlayer = (playerId: number) => {
    setSelectedPlayers(prev => prev.filter(p => p.id_player !== playerId));
    setCollectingPlayerIds(ids => ids.filter(id => id !== playerId));
  };

  const toggleCollecting = (playerId: number) => {
    setCollectingPlayerIds(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const reorderPlayers = (from: number, to: number) => {
    setSelectedPlayers(prev => {
      const next = reorderList(prev, from, to);
      return next ?? prev;
    });
  };

  const scratchPayload = () => ({
    player_ids: selectedPlayers.map(p => p.id_player),
    court_names: courts,
    time_start: timeStart,
    time_end: timeEnd,
    opponents_per_player: Number(opponents) || undefined,
    repeat_partners: Number(repeat) || undefined,
    include_final: includeFinal,
    has_demonstrative_match: hasDemonstrative,
    adjust: adjust,
    color: selectedColor,
    organizer_id: organizerId === NO_ORGANIZER ? null : organizerId,
    club_id: clubId === NO_CLUB ? null : clubId,
    collecting_player_ids: collectingPlayerIds,
  });

  const runPreview = async () => {
    const res = await scratchScheduleApi.preview(scratchPayload());
    setPreview(res.data);
  };

  const downloadMatchesPdf = async (courtIndex: number) => {
    if (Platform.OS !== 'web') {
      throw new Error('PDF download is web-only.');
    }
    await scratchScheduleApi.downloadMatchesPdf(
      {
        ...scratchPayload(),
        title: divisionNamePdf,
        edition_label: editionName,
        court_index: courtIndex,
      },
      `scratch-matches-court-${courtIndex + 1}.pdf`
    );
  };

  const downloadRankingPdf = async () => {
    if (Platform.OS !== 'web') {
      throw new Error('PDF download is web-only.');
    }
    await scratchScheduleApi.downloadRankingPdf(
      {
        ...scratchPayload(),
        title: divisionNamePdf,
        edition_label: editionName,
      },
      'scratch-ranking.pdf'
    );
  };

  const formColumn = (
    <View className="flex-1 bg-white border border-gray-200 rounded-lg p-4 mb-4 gap-2 min-w-0">
      <Text className="font-semibold text-gray-900">
        Mode B — Scratch schedule
      </Text>

      <View
        testID="tools-branding-row"
        className="flex-row flex-wrap gap-3 items-end"
      >
        <View className="flex-1" style={{ minWidth: 140 }}>
          <Text className="text-xs text-gray-500 mb-1">Edition name</Text>
          <AppTextInput
            className="border border-gray-300 rounded px-3 py-2"
            placeholder="Edition name"
            value={editionName}
            onChangeText={setEditionName}
            maxLength={25}
            testID="tools-edition-name"
          />
        </View>
        <View
          testID="tools-organizer-picker"
          className="flex-1"
          style={{ minWidth: 160 }}
        >
          <Text className="text-xs text-gray-500 mb-1">Organizer branding</Text>
          <SingleSelectDropdown
            options={organizerOptions}
            selectedValue={organizerId}
            onSelectionChange={v => setOrganizerId(Number(v))}
            placeholder="Organizer"
            title="Organizer branding"
            minWidth={160}
          />
        </View>
        <View
          testID="tools-club-picker"
          className="flex-1"
          style={{ minWidth: 160 }}
        >
          <Text className="text-xs text-gray-500 mb-1">Club host branding</Text>
          <SingleSelectDropdown
            options={clubOptions}
            selectedValue={clubId}
            onSelectionChange={v => setClubId(Number(v))}
            placeholder="Club host"
            title="Club host branding"
            minWidth={160}
          />
        </View>
      </View>

      <View
        testID="tools-division-row"
        className="flex-row flex-wrap gap-3 items-end"
      >
        <View
          className="flex-1"
          style={{ minWidth: 160 }}
          testID="tools-division-picker"
        >
          <Text className="text-xs text-gray-500 mb-1">Division</Text>
          <SingleSelectDropdown
            options={
              divisionOptions.length
                ? divisionOptions
                : selectedDivisionId != null
                  ? [
                      {
                        label: selectedColor,
                        value: selectedDivisionId,
                      },
                    ]
                  : []
            }
            selectedValue={selectedDivisionId}
            onSelectionChange={v => applyDivisionSelection(Number(v))}
            placeholder="Select division"
            title="Division"
            minWidth={160}
          />
        </View>
        <View className="flex-1" style={{ minWidth: 160 }}>
          <Text className="text-xs text-gray-500 mb-1">Division name (PDF)</Text>
          <AppTextInput
            className="border border-gray-300 rounded px-3 py-2"
            placeholder="Division name for PDF"
            value={divisionNamePdf}
            onChangeText={setDivisionNamePdf}
            testID="tools-division-name-pdf"
          />
        </View>
      </View>

      <View testID="tools-players-field">
        <Text className="text-xs text-gray-500 mb-1">Players</Text>
        <View testID="tools-player-picker">
          <SingleSelectDropdown
            options={playerPicker.options}
            selectedValue={pendingPlayerId}
            onSelectionChange={addPlayerFromPicker}
            placeholder="Select player"
            title="Players"
            minWidth={220}
            searchable
            onSearch={playerPicker.onSearch}
            loading={playerPicker.loading}
            clearable
          />
        </View>
      </View>

      <View testID="tools-courts-field">
        <Text className="text-xs text-gray-500 mb-1">Courts</Text>
        <View
          testID="tools-courts-row"
          className="flex-row flex-wrap items-center gap-2"
        >
          {courts.map((name, i) => (
            <View
              key={`${i}-${name}`}
              testID={`tools-court-badge-${i}`}
              className="flex-row items-center bg-gray-100 border border-gray-300 rounded px-2 py-1"
            >
              <Text className="text-sm text-gray-800 mr-1">{name}</Text>
              <Pressable
                onPress={() => removeCourt(i)}
                testID={`tools-court-remove-${i}`}
                accessibilityLabel={`Remove ${name}`}
              >
                <Ionicons name="close-circle" size={16} color="#9ca3af" />
              </Pressable>
            </View>
          ))}
          <AppTextInput
            className="border border-gray-300 rounded px-3 py-2 min-w-[120px] flex-1"
            placeholder={
              courts.length >= MAX_COURTS
                ? 'Max 4 courts'
                : 'Court name'
            }
            value={courtDraft}
            onChangeText={setCourtDraft}
            onSubmitEditing={addCourt}
            editable={courts.length < MAX_COURTS}
            testID="tools-court-draft"
          />
          <ActionButton
            testID="tools-court-add"
            label="Add"
            variant="secondary"
            size="sm"
            disabled={courts.length >= MAX_COURTS}
            onPress={addCourt}
          />
        </View>
      </View>

      <View className="flex-row gap-2">
        <View className="flex-1">
          <Text className="text-xs text-gray-500 mb-1">Start</Text>
          <AppTextInput
            className="border border-gray-300 rounded px-3 py-2"
            placeholder="Start"
            value={timeStart}
            onChangeText={setTimeStart}
            testID="tools-time-start"
          />
        </View>
        <View className="flex-1">
          <Text className="text-xs text-gray-500 mb-1">End</Text>
          <AppTextInput
            className="border border-gray-300 rounded px-3 py-2"
            placeholder="End"
            value={timeEnd}
            onChangeText={setTimeEnd}
            testID="tools-time-end"
          />
        </View>
      </View>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Text className="text-xs text-gray-500 mb-1">Opponents</Text>
          <AppTextInput
            className="border border-gray-300 rounded px-3 py-2"
            placeholder="Opponents"
            value={opponents}
            onChangeText={setOpponents}
            keyboardType="numeric"
            testID="tools-opponents"
          />
        </View>
        <View className="flex-1">
          <Text className="text-xs text-gray-500 mb-1">Repeat</Text>
          <AppTextInput
            className="border border-gray-300 rounded px-3 py-2"
            placeholder="Repeat"
            value={repeat}
            onChangeText={setRepeat}
            keyboardType="numeric"
            testID="tools-repeat"
          />
        </View>
      </View>

      <Pressable
        onPress={() => setIncludeFinal(v => !v)}
        className="flex-row items-center"
      >
        <Ionicons
          name={includeFinal ? 'checkbox' : 'square-outline'}
          size={20}
          color="#2563eb"
        />
        <Text className="ml-2 text-sm text-gray-800">Include final</Text>
      </Pressable>
      <Pressable
        onPress={() => setHasDemonstrative(v => !v)}
        className="flex-row items-center"
      >
        <Ionicons
          name={hasDemonstrative ? 'checkbox' : 'square-outline'}
          size={20}
          color="#2563eb"
        />
        <Text className="ml-2 text-sm text-gray-800">Demonstrative match</Text>
      </Pressable>

      <Text className="text-xs text-gray-500">Adjust (±2 / ±4 / ±6)</Text>
      <View className="flex-row flex-wrap gap-2">
        {[-6, -4, -2, 0, 2, 4, 6].map(n => (
          <Pressable
            key={n}
            onPress={() => setAdjust(n)}
            className={`px-3 py-1 rounded border ${
              adjust === n
                ? 'bg-blue-600 border-blue-600'
                : 'bg-white border-gray-300'
            }`}
          >
            <Text
              className={
                adjust === n ? 'text-white text-sm' : 'text-gray-700 text-sm'
              }
            >
              {n > 0 ? `+${n}` : String(n)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="flex-row flex-wrap gap-2 mt-2">
        <ActionButton
          testID="tools-preview"
          label="Preview"
          variant="primary"
          size="sm"
          status={previewStatus.status}
          errorMessage={previewStatus.errorMessage ?? undefined}
          onPress={() => void previewStatus.run(runPreview)}
        />
        {courts.map((name, i) => (
          <CourtMatchesPdfButton
            key={`${i}-${name}`}
            courtIndex={i}
            courtName={name}
            onDownload={downloadMatchesPdf}
          />
        ))}
        <ActionButton
          testID="tools-pdf-ranking"
          label="PDF Ranking"
          startIcon="download"
          variant="positive"
          size="sm"
          status={pdfRankingStatus.status}
          errorMessage={pdfRankingStatus.errorMessage ?? undefined}
          onPress={() => void pdfRankingStatus.run(downloadRankingPdf)}
        />
      </View>

      {preview && (
        <View className="mt-2" testID="tools-preview-summary">
          <Text className="text-xs text-gray-600">
            Template file: {String(preview.template_file ?? '—')}
          </Text>
          <Text className="text-xs text-gray-600">
            Template version: {String(preview.template_version ?? '—')}
          </Text>
          <Text className="text-xs text-gray-600">
            Average playing time / match:{' '}
            {preview.average_playing_time_minutes != null
              ? `${preview.average_playing_time_minutes} min`
              : '—'}
          </Text>
          <Text className="text-xs text-gray-600">
            Matches: {String(preview.matches_count ?? '—')}
          </Text>
          <Text className="text-xs text-gray-600">
            Points per match:{' '}
            {preview.points_per_match_print != null
              ? String(preview.points_per_match_print)
              : '—'}
          </Text>
        </View>
      )}
    </View>
  );

  const selectedColumn =
    selectedPlayers.length > 0 ? (
      <View
        testID="tools-selected-players"
        className="w-80 mb-4 ml-3 bg-white border border-gray-200 rounded-lg p-4 gap-1"
        style={
          Platform.OS === 'web'
            ? ({ position: 'sticky', top: 0 } as any)
            : undefined
        }
      >
        <Text className="font-semibold text-gray-900 mb-1">
          Selected players ({selectedPlayers.length})
        </Text>
        {selectedPlayers.map((p, index) => {
          const collecting = collectingPlayerIds.includes(p.id_player);
          return (
            <SortableRow
              key={`sel-${p.id_player}`}
              index={index}
              count={selectedPlayers.length}
              locked={false}
              rowHeight={SORTABLE_ROW_HEIGHT}
              activationMode="handle"
              onReorder={reorderPlayers}
              testID={`tools-player-row-${p.id_player}`}
            >
              <View
                className="flex-row items-center"
                style={{ height: SORTABLE_ROW_HEIGHT, gap: 6 }}
              >
                <SortableDragHandle
                  testID={`tools-player-drag-${p.id_player}`}
                />
                <CachedPdfImageReload
                  testIdPrefix={`tools-player-avatar-${p.id_player}`}
                  imageUrl={avatarUrlFor(
                    p.id_player,
                    p.pdf_avatar_url ?? null
                  )}
                  size={28}
                  spinning={Boolean(avatarSpinning[p.id_player])}
                  errorReason={avatarErrors[p.id_player] || null}
                  onReload={() =>
                    void reloadAvatar({
                      key: p.id_player,
                      playerId: p.id_player,
                      collecting,
                    })
                  }
                />
                <View className="flex-row items-center">
                  <Pressable
                    onPress={() => toggleCollecting(p.id_player)}
                    className="flex-row items-center"
                    testID={`tools-collecting-${p.id_player}`}
                    accessibilityLabel="Collecting points"
                  >
                    <Ionicons
                      name={collecting ? 'checkbox' : 'square-outline'}
                      size={18}
                      color="#6b7280"
                    />
                  </Pressable>
                  <Tooltip
                    content={COLLECTING_POINTS_TOOLTIP}
                    testID={`tools-collecting-tip-${p.id_player}`}
                  >
                    <Ionicons
                      name="albums-outline"
                      size={16}
                      color="#6b7280"
                      style={{ marginLeft: 4 }}
                    />
                  </Tooltip>
                </View>
                <Text className="ml-1 text-sm text-gray-800 flex-1" numberOfLines={1}>
                  {playerDisplayName(p)}
                </Text>
                <Pressable
                  onPress={() => removePlayer(p.id_player)}
                  className="p-1"
                  testID={`tools-remove-player-${p.id_player}`}
                  accessibilityLabel={`Remove ${playerDisplayName(p)}`}
                >
                  <Ionicons name="close-circle" size={20} color="#9ca3af" />
                </Pressable>
              </View>
            </SortableRow>
          );
        })}
      </View>
    ) : null;

  return (
    <AppLayout
      title="Templates"
      description="Catalog, metrics, Mode B preview / PDF"
      headerActions={
        <ActionButton
          label="Reload"
          startIcon="refresh"
          pendingAppearance="spinIcon"
          variant="secondary"
          status={reloadStatus.status}
          errorMessage={reloadStatus.errorMessage ?? undefined}
          onPress={() => {
            void reloadStatus.run(loadTools);
          }}
        />
      }
    >
      <TemplatesBreadcrumbs />
      <View className="p-4">
        {error && (
          <Text className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">
            {error}
          </Text>
        )}
        {loading && <ActivityIndicator />}

        <View className="flex-row mb-4 border-b border-gray-200">
          <Pressable
            onPress={() => setActiveTab('modeB')}
            className={`px-4 py-2 mr-2 border-b-2 ${
              activeTab === 'modeB' ? 'border-blue-600' : 'border-transparent'
            }`}
            testID="tools-tab-mode-b"
          >
            <Text
              className={
                activeTab === 'modeB'
                  ? 'text-blue-600 font-semibold'
                  : 'text-gray-600'
              }
            >
              Mode B — Scratch schedule
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('catalog')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'catalog'
                ? 'border-blue-600'
                : 'border-transparent'
            }`}
            testID="tools-tab-catalog"
          >
            <Text
              className={
                activeTab === 'catalog'
                  ? 'text-blue-600 font-semibold'
                  : 'text-gray-600'
              }
            >
              Schedule Templates
            </Text>
          </Pressable>
        </View>

        {activeTab === 'catalog' && (
          <>
            <View className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <Text className="font-semibold text-gray-900 mb-2">
                Template catalog
              </Text>
              <AdvancedDataTable
                data={catalogRows}
                primaryKeyField="id"
                columns={[
                  {
                    key: 'players',
                    label: 'Players',
                    sortable: false,
                    width: 80,
                  },
                  {
                    key: 'partners',
                    label: 'Partners',
                    sortable: false,
                    width: 80,
                  },
                  {
                    key: 'repeat',
                    label: 'Repeat',
                    sortable: false,
                    width: 80,
                  },
                  {
                    key: 'courts',
                    label: 'Courts',
                    sortable: false,
                    width: 80,
                  },
                  {
                    key: 'fixed_teams',
                    label: 'Fixed',
                    sortable: false,
                    width: 80,
                  },
                ]}
                emptyMessage="No catalog rows"
              />
            </View>

            <View className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <Text className="font-semibold text-gray-900 mb-2">Metrics</Text>
              {metrics?.summary != null && (
                <Text className="text-sm text-gray-700 mb-2">
                  Summary: {String(metrics.summary)}
                </Text>
              )}
              <AdvancedDataTable
                data={metricsRows}
                primaryKeyField="id"
                columns={[
                  { key: 'key', label: 'Metric', sortable: false, width: 160 },
                  { key: 'value', label: 'Value', sortable: false, width: 240 },
                ]}
                emptyMessage="No metrics"
              />
            </View>
          </>
        )}

        {activeTab === 'modeB' && (
          <View className="flex-row flex-wrap items-start">
            {formColumn}
            {selectedColumn}
          </View>
        )}
      </View>
    </AppLayout>
  );
}

function TemplatesBreadcrumbs() {
  useBreadcrumbSegments('tools-templates', [{ label: 'Templates' }]);
  return null;
}
