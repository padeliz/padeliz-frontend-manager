/**
 * Tools — Templates catalog / metrics + Mode B scratch schedule
 */

import AppLayout from '@/components/layout/AppLayout';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import AppTextInput from '@/components/ui/AppTextInput';
import AdvancedDataTable from '@/components/ui/AdvancedDataTable';
import ActionButton from '@/components/ui/ActionButton';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { queryKeys } from '@/lib/queryClient';
import { ClubsApiService } from '@/services/api/clubsApi';
import { DivisionsApiService } from '@/services/api/divisionsApi';
import { organizersApi } from '@/services/api/organizersApi';
import { PlayersApiService } from '@/services/api/playersApi';
import { scratchScheduleApi } from '@/services/api/scratchScheduleApi';
import { templatesToolsApi } from '@/services/api/templatesToolsApi';
import { ApiDivision, ApiPlayer } from '@/types/api/entities';
import { SchedulePreview } from '@/types/api/edition';
import {
  filterPlayersLocally,
  loadAllPlayersPages,
} from '@/utils/edition/playerCache';
import { flattenMatchesByCourt } from '@/utils/edition/schedulePreview';
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

const playersApi = new PlayersApiService();
const divisionsApi = new DivisionsApiService();
const clubsApi = new ClubsApiService();

const NO_CLUB = 0;

/** Downloads flash a checkmark and fall back to idle; other actions stay sticky. */
const DOWNLOAD_SUCCESS_HOLD_MS = 4000;

export default function ToolsTemplatesPage() {
  const reloadStatus = useActionButtonStatus({ successHoldMs: 4000 });
  const previewStatus = useActionButtonStatus();
  const pdfMatchesStatus = useActionButtonStatus({
    successHoldMs: DOWNLOAD_SUCCESS_HOLD_MS,
  });
  const pdfRankingStatus = useActionButtonStatus({
    successHoldMs: DOWNLOAD_SUCCESS_HOLD_MS,
  });
  const demoStatus = useActionButtonStatus({ auditoryFeedback: true });
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
    () =>
      (organizersQuery.data || []).map(o => ({
        label: `${o.id_organizer}. ${o.name}`,
        value: o.id_organizer,
      })),
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
  const [demo, setDemo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [playerCache, setPlayerCache] = useState<ApiPlayer[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playerQuery, setPlayerQuery] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<ApiPlayer[]>([]);
  const [collectingPlayerIds, setCollectingPlayerIds] = useState<number[]>([]);
  const [courtNames, setCourtNames] = useState('Court 1, Court 2');
  const [timeStart, setTimeStart] = useState('10:00');
  const [timeEnd, setTimeEnd] = useState('16:00');
  const [opponents, setOpponents] = useState('3');
  const [repeat, setRepeat] = useState('1');
  const [preview, setPreview] = useState<SchedulePreview | null>(null);
  const [pdfTitle, setPdfTitle] = useState('Scratch MiniTour');
  const [courtIndex, setCourtIndex] = useState('0');
  const [organizerId, setOrganizerId] = useState(1);
  const [clubId, setClubId] = useState<number>(NO_CLUB);
  const [divisions, setDivisions] = useState<ApiDivision[]>([]);
  const [color, setColor] = useState('#2563eb');
  const [includeFinal, setIncludeFinal] = useState(false);
  const [hasDemonstrative, setHasDemonstrative] = useState(false);
  const [adjust, setAdjust] = useState(0);
  const [activeTab, setActiveTab] = useState<'catalog' | 'modeB'>('catalog');

  const previewMatches = useMemo(
    () => flattenMatchesByCourt(preview?.matches_by_court),
    [preview]
  );

  const filteredPlayers = useMemo(
    () => filterPlayersLocally(playerCache, playerQuery),
    [playerCache, playerQuery]
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

  const loadPlayersCache = useCallback(async () => {
    setPlayersLoading(true);
    try {
      const all = await loadAllPlayersPages(
        async (page, perPage) => {
          const res = await playersApi.getPlayers({ page, per_page: perPage });
          return { data: res.data || [], meta: res.meta as any };
        },
        100,
        partial => setPlayerCache(partial as ApiPlayer[])
      );
      setPlayerCache(all as ApiPlayer[]);
    } catch (e: any) {
      setError(e?.message || 'Failed to preload players');
    } finally {
      setPlayersLoading(false);
    }
  }, []);

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
      if (list[0]?.color) setColor(list[0].color);
    } catch (e: any) {
      setError(e?.message || 'Failed to load templates tools');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTools().catch(() => {});
    void loadPlayersCache();
  }, [loadTools, loadPlayersCache]);

  const togglePlayer = (player: ApiPlayer) => {
    setSelectedPlayers(prev => {
      if (prev.some(p => p.id_player === player.id_player)) {
        setCollectingPlayerIds(ids =>
          ids.filter(id => id !== player.id_player)
        );
        return prev.filter(p => p.id_player !== player.id_player);
      }
      setCollectingPlayerIds(ids =>
        ids.includes(player.id_player) ? ids : [...ids, player.id_player]
      );
      return [...prev, player];
    });
  };

  const toggleCollecting = (playerId: number) => {
    setCollectingPlayerIds(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const parseCourts = () =>
    courtNames
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 4);

  const scratchPayload = () => ({
    player_ids: selectedPlayers.map(p => p.id_player),
    court_names: parseCourts(),
    time_start: timeStart,
    time_end: timeEnd,
    opponents_per_player: Number(opponents) || undefined,
    repeat_partners: Number(repeat) || undefined,
    include_final: includeFinal,
    has_demonstrative_match: hasDemonstrative,
    adjust: adjust || undefined,
    color,
    organizer_id: organizerId,
    club_id: clubId === NO_CLUB ? null : clubId,
    collecting_player_ids: collectingPlayerIds,
  });

  const runPreview = async () => {
    const res = await scratchScheduleApi.preview(scratchPayload());
    setPreview(res.data);
  };

  const downloadPdf = async (kind: 'matches' | 'ranking') => {
    if (Platform.OS !== 'web') {
      throw new Error('PDF download is web-only.');
    }
    const base = {
      ...scratchPayload(),
      title: pdfTitle,
    };
    if (kind === 'matches') {
      await scratchScheduleApi.downloadMatchesPdf(
        { ...base, court_index: Number(courtIndex) || 0 },
        'scratch-matches.pdf'
      );
    } else {
      await scratchScheduleApi.downloadRankingPdf(base, 'scratch-ranking.pdf');
    }
  };

  const runDemo = async () => {
    const players = selectedPlayers.length || 8;
    const partners = Number(opponents) || 3;
    const rep = Number(repeat) || 1;
    const courts = parseCourts().length || 2;
    const res = await templatesToolsApi.demo(players, partners, rep, courts);
    setDemo(res.data);
  };

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
              onPress={() => setActiveTab('catalog')}
              className={`px-4 py-2 mr-2 border-b-2 ${
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
            <Pressable
              onPress={() => setActiveTab('modeB')}
              className={`px-4 py-2 border-b-2 ${
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
                { key: 'players', label: 'Players', sortable: false, width: 80 },
                { key: 'partners', label: 'Partners', sortable: false, width: 80 },
                { key: 'repeat', label: 'Repeat', sortable: false, width: 80 },
                { key: 'courts', label: 'Courts', sortable: false, width: 80 },
                { key: 'fixed_teams', label: 'Fixed', sortable: false, width: 80 },
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
          <View className="bg-white border border-gray-200 rounded-lg p-4 mb-4 gap-2">
            <Text className="font-semibold text-gray-900">
              Mode B — Scratch schedule
            </Text>
            <Text className="text-xs text-gray-500">
              Players cached locally
              {playersLoading
                ? ` (loading… ${playerCache.length})`
                : ` (${playerCache.length})`}
              . Type ≥2 characters to filter.
            </Text>
            <AppTextInput
              className="border border-gray-300 rounded px-3 py-2"
              placeholder="Filter players (min 2 chars)"
              value={playerQuery}
              onChangeText={setPlayerQuery}
              testID="tools-player-filter"
            />
            {filteredPlayers.slice(0, 40).map(p => (
              <Pressable
                key={p.id_player}
                onPress={() => togglePlayer(p)}
                className="py-1"
              >
                <Text className="text-sm text-gray-800">
                  {selectedPlayers.some(s => s.id_player === p.id_player)
                    ? '✓ '
                    : '○ '}
                  {p.name || `${p.first_name} ${p.last_name}`} (#{p.id_player})
                </Text>
              </Pressable>
            ))}

            <Text className="text-xs text-gray-500 mt-1">
              Selected players / collecting points
            </Text>
            {selectedPlayers.map(p => {
              const collecting = collectingPlayerIds.includes(p.id_player);
              return (
                <Pressable
                  key={`sel-${p.id_player}`}
                  onPress={() => toggleCollecting(p.id_player)}
                  className="flex-row items-center py-1"
                >
                  <Ionicons
                    name={collecting ? 'checkbox' : 'square-outline'}
                    size={18}
                    color="#2563eb"
                  />
                  <Text className="ml-2 text-sm text-gray-800">
                    {p.name || `${p.first_name} ${p.last_name}`} collecting
                  </Text>
                </Pressable>
              );
            })}

            <AppTextInput
              className="border border-gray-300 rounded px-3 py-2"
              placeholder="Courts (comma, max 4)"
              value={courtNames}
              onChangeText={setCourtNames}
            />
            <View className="flex-row gap-2">
              <AppTextInput
                className="flex-1 border border-gray-300 rounded px-3 py-2"
                placeholder="Start"
                value={timeStart}
                onChangeText={setTimeStart}
              />
              <AppTextInput
                className="flex-1 border border-gray-300 rounded px-3 py-2"
                placeholder="End"
                value={timeEnd}
                onChangeText={setTimeEnd}
              />
            </View>
            <View className="flex-row gap-2">
              <AppTextInput
                className="flex-1 border border-gray-300 rounded px-3 py-2"
                placeholder="Opponents"
                value={opponents}
                onChangeText={setOpponents}
                keyboardType="numeric"
              />
              <AppTextInput
                className="flex-1 border border-gray-300 rounded px-3 py-2"
                placeholder="Repeat"
                value={repeat}
                onChangeText={setRepeat}
                keyboardType="numeric"
              />
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
              <Text className="ml-2 text-sm text-gray-800">
                Demonstrative match
              </Text>
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
                      adjust === n
                        ? 'text-white text-sm'
                        : 'text-gray-700 text-sm'
                    }
                  >
                    {n > 0 ? `+${n}` : String(n)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="text-xs text-gray-500 mt-1">Division color</Text>
            <SingleSelectDropdown
              options={
                divisions.length
                  ? divisions.map(d => ({
                      label: `${d.name} (${d.color})`,
                      value: d.color,
                    }))
                  : [{ label: color, value: color }]
              }
              selectedValue={color}
              onSelectionChange={v => setColor(String(v))}
              placeholder="Select color"
              title="Division color"
              minWidth={220}
            />

            <Text className="text-xs text-gray-500 mt-1">Organizer branding</Text>
            <View testID="tools-organizer-picker">
              <SingleSelectDropdown
                options={organizerOptions}
                selectedValue={organizerId}
                onSelectionChange={v => setOrganizerId(Number(v))}
                placeholder="Organizer"
                title="Organizer branding"
                minWidth={220}
              />
            </View>

            <Text className="text-xs text-gray-500 mt-1">Club host branding</Text>
            <View testID="tools-club-picker">
              <SingleSelectDropdown
                options={clubOptions}
                selectedValue={clubId}
                onSelectionChange={v => setClubId(Number(v))}
                placeholder="Club host"
                title="Club host branding"
                minWidth={220}
              />
            </View>

            <AppTextInput
              className="border border-gray-300 rounded px-3 py-2"
              placeholder="PDF title"
              value={pdfTitle}
              onChangeText={setPdfTitle}
            />
            <AppTextInput
              className="border border-gray-300 rounded px-3 py-2"
              placeholder="court_index for matches PDF"
              value={courtIndex}
              onChangeText={setCourtIndex}
              keyboardType="numeric"
            />
            <View className="flex-row flex-wrap gap-2">
              <ActionButton
                testID="tools-preview"
                label="Preview"
                variant="primary"
                size="sm"
                status={previewStatus.status}
                errorMessage={previewStatus.errorMessage ?? undefined}
                onPress={() => void previewStatus.run(runPreview)}
              />
              <ActionButton
                testID="tools-pdf-matches"
                label="PDF Matches"
                startIcon="download"
                variant="positive"
                size="sm"
                status={pdfMatchesStatus.status}
                errorMessage={pdfMatchesStatus.errorMessage ?? undefined}
                onPress={() =>
                  void pdfMatchesStatus.run(() => downloadPdf('matches'))
                }
              />
              <ActionButton
                testID="tools-pdf-ranking"
                label="PDF Ranking"
                startIcon="download"
                variant="positive"
                size="sm"
                status={pdfRankingStatus.status}
                errorMessage={pdfRankingStatus.errorMessage ?? undefined}
                onPress={() =>
                  void pdfRankingStatus.run(() => downloadPdf('ranking'))
                }
              />
              <ActionButton
                testID="tools-demo"
                label="Template demo"
                variant="ghost"
                size="sm"
                status={demoStatus.status}
                errorMessage={demoStatus.errorMessage ?? undefined}
                onPress={() => void demoStatus.run(runDemo)}
              />
            </View>
            {preview && (
              <View className="mt-2">
                <Text className="text-xs text-gray-600 font-mono">
                  matches={String(preview.matches_count)} points=
                  {String(preview.points_per_match)} template=
                  {String(preview.template_version)}
                </Text>
                {previewMatches.slice(0, 12).map((m, i) => (
                  <Text key={i} className="text-xs text-gray-500 mt-1">
                    {m.court_name || `Court ${m.court_index}`} · A:
                    {(m.side_a || []).join(',')} vs B:
                    {(m.side_b || []).join(',')}
                  </Text>
                ))}
              </View>
            )}
            {demo && (
              <Text className="text-xs text-gray-600 mt-2">
                Demo loaded — players={String((demo as any).players ?? '—')}{' '}
                matches={String((demo as any).matches_count ?? '—')}
              </Text>
            )}
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
