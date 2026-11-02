/**
 * Presentational schedule board metrics (General view + board chrome).
 * Kept separate from EventScheduleMatchesBoard so consumers do not pull
 * the players/API/downloadBlob graph.
 */

import { ScheduleBoardMetrics } from '@/types/api/event';
import React from 'react';
import { Text, View } from 'react-native';

export function ScheduleBoardMetricsCards({
  metrics,
  emptyLabel = 'No matches.',
}: {
  metrics: ScheduleBoardMetrics | null | undefined;
  emptyLabel?: string;
}) {
  if (!metrics) {
    return (
      <Text testID="schedule-metrics-empty" className="text-sm text-gray-500">
        {emptyLabel}
      </Text>
    );
  }

  const identity = metrics.template_identity;
  const versionPart =
    identity?.version != null ? ` · v${identity.version}` : '';
  const avgPct = metrics.playing_distribution?.percentage ?? 0;

  return (
    <View testID="schedule-metrics-cards" className="gap-2">
      <Text testID="metric-players" className="text-sm text-gray-800">
        Players: {metrics.players_count}
      </Text>
      <Text testID="metric-matches" className="text-sm text-gray-800">
        Matches: {metrics.matches_count}
      </Text>
      <Text testID="metric-points" className="text-sm text-gray-800">
        Points/match: {metrics.points_per_match_print ?? '—'}
      </Text>
      <Text testID="metric-variation" className="text-sm text-gray-800">
        Partners variation: {metrics.partners_count_variation}
      </Text>
      <Text testID="metric-meeting" className="text-sm text-gray-800">
        Meeting players: {metrics.min_opponents_met}–{metrics.max_opponents_met}
      </Text>
      <Text testID="metric-distribution" className="text-sm text-gray-800">
        Min/avg playing %: {avgPct}%
      </Text>
      <Text testID="metric-template" className="text-sm text-gray-800">
        Template: {identity?.players}p / {identity?.partners} partners /{' '}
        {identity?.repeat} repeat / {identity?.courts} courts{versionPart}
      </Text>
    </View>
  );
}
