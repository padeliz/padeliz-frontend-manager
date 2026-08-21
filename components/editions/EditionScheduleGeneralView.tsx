/**
 * Read-only stacked schedule view when Edition workspace is on General.
 */

import { EditionGeneralEditHint } from '@/components/editions/editionGeneralHint';
import { ScheduleBoardMetricsCards } from '@/components/editions/EditionScheduleMatchesBoard';
import { queryKeys } from '@/lib/queryClient';
import { scheduleApi } from '@/services/api/scheduleApi';
import { ApiEditionDivision } from '@/types/api/entities';
import { ScheduleState } from '@/types/api/edition';
import { useQueries } from '@tanstack/react-query';
import React, { useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import type { ScheduleSection } from './EditionScheduleTab';

type Props = {
  divisions: ApiEditionDivision[];
  section: ScheduleSection;
};

function divisionTitle(d: ApiEditionDivision): string {
  return d.division_title || `ED #${d.id_edition_division}`;
}

function KnobsReadonly({ state }: { state: ScheduleState }) {
  const ed = state.edition_division || {};
  const schedule = state.schedule || null;
  const courts = state.courts || [];
  return (
    <View className="gap-2">
      <Text className="text-sm text-gray-600">
        Matches: {state.has_regular_matches ? 'yes' : 'no'} · Scores:{' '}
        {state.has_scores ? 'yes' : 'no'} · Standings:{' '}
        {state.has_standings ? 'yes' : 'no'} · Finalized:{' '}
        {state.is_finalized ? 'yes' : 'no'}
      </Text>
      <Text className="text-sm text-gray-800">
        {ed.playing_start_time || '—'} – {ed.playing_end_time || '—'} ·
        opponents {schedule?.player_opponents_nr ?? '—'} · repeat{' '}
        {schedule?.player_matches_repeat ?? '—'} · final points{' '}
        {schedule?.final_points_target ?? '—'}
      </Text>
      <Text className="text-sm text-gray-600">
        include_final: {schedule?.include_final ? 'yes' : 'no'} ·
        demonstrative: {schedule?.has_demonstrative_match ? 'yes' : 'no'} ·
        scores: {schedule?.include_scores ? 'yes' : 'no'} · replacements:{' '}
        {schedule?.allow_replacements ? 'yes' : 'no'} · adjust{' '}
        {schedule?.adjust ?? 0}
        {schedule?.points_per_match != null
          ? ` · points/match ${schedule.points_per_match}`
          : ''}
      </Text>
      <Text className="text-sm text-gray-600">
        Courts:{' '}
        {courts.length === 0
          ? 'none'
          : courts.map((c: any) => c.name || `#${c.id_court}`).join(', ')}
      </Text>
    </View>
  );
}

function MatchesReadonly({ state }: { state: ScheduleState }) {
  return (
    <ScheduleBoardMetricsCards
      metrics={state.board_metrics}
      emptyLabel="No matches."
    />
  );
}

export default function EditionScheduleGeneralView({
  divisions,
  section,
}: Props) {
  const queries = useQueries({
    queries: divisions.map(d => ({
      queryKey: queryKeys.schedule(d.id_edition_division),
      queryFn: async () => {
        const res = await scheduleApi.getSchedule(d.id_edition_division);
        return res.data as ScheduleState;
      },
    })),
  });

  const loading = queries.some(q => q.isLoading);

  const sections = useMemo(
    () =>
      divisions.map((d, i) => ({
        division: d,
        state: queries[i]?.data,
        error: queries[i]?.error as Error | null,
      })),
    [divisions, queries]
  );

  if (loading && sections.every(s => !s.state)) {
    return <ActivityIndicator />;
  }

  return (
    <View className="gap-4" testID="schedule-general-view">
      <EditionGeneralEditHint />
      {sections.map(({ division, state, error }) => (
        <View
          key={division.id_edition_division}
          testID={`schedule-general-ed-${division.id_edition_division}`}
          className="bg-white border border-gray-200 rounded-lg p-4 gap-2"
        >
          <Text className="font-semibold text-gray-900">
            {divisionTitle(division)}
          </Text>
          {error ? (
            <Text className="text-sm text-red-600">
              {error.message || 'Failed to load schedule'}
            </Text>
          ) : !state ? (
            <Text className="text-sm text-gray-500">No schedule</Text>
          ) : section === 'knobs' ? (
            <KnobsReadonly state={state} />
          ) : (
            <MatchesReadonly state={state} />
          )}
        </View>
      ))}
      {divisions.length === 0 && (
        <Text className="text-sm text-gray-500">No edition divisions.</Text>
      )}
    </View>
  );
}
