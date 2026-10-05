/**
 * React Query client + keys for Manager server state.
 */

import { QueryClient } from '@tanstack/react-query';

export function createManagerQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export const queryKeys = {
  resourceList: (
    resourceName: string,
    params: Record<string, unknown>
  ) => ['resourceList', resourceName, params] as const,
  resourceDetail: (resourceName: string, id: number | string) =>
    ['resourceDetail', resourceName, id] as const,
  event: (id: number | string) => ['event', id] as const,
  eventDivisions: (eventId: number | string) =>
    ['eventDivisions', eventId] as const,
  schedule: (eventDivisionId: number | string) =>
    ['schedule', eventDivisionId] as const,
  standings: (eventDivisionId: number | string) =>
    ['standings', eventDivisionId] as const,
  organizers: () => ['organizers'] as const,
  clubsPicker: () => ['clubsPicker'] as const,
  lotteryLive: (lotteryId: number | string) =>
    ['lotteryLive', lotteryId] as const,
  eventLotteries: (eventId: number | string) =>
    ['eventLotteries', eventId] as const,
  eventLotteryRules: (lotteryId: number | string) =>
    ['eventLotteryRules', lotteryId] as const,
  eventLotteryPrizes: (lotteryId: number | string) =>
    ['eventLotteryPrizes', lotteryId] as const,
  eventLotteryPrizesWithLuckies: (lotteryId: number | string) =>
    ['eventLotteryPrizesWithLuckies', lotteryId] as const,
  eventLotteryLuckies: (lotteryId: number | string) =>
    ['eventLotteryLuckies', lotteryId] as const,
  lotteryPrizesBoard: (lotteryId: number | string) =>
    ['lotteryPrizesBoard', lotteryId] as const,
  replacements: (eventDivisionId: number | string) =>
    ['replacements', eventDivisionId] as const,
  eventReplacements: (eventId: number | string) =>
    ['eventReplacements', eventId] as const,
  registrationQueueCounts: () => ['registrationQueueCounts'] as const,
  playersPicker: (params: {
    q?: string;
    page?: number;
    per_page?: number;
  } = {}) =>
    [
      'playersPicker',
      {
        q: params.q,
        page: params.page ?? 1,
        per_page: params.per_page,
      },
    ] as const,
};
