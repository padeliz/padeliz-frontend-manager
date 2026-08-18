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
  edition: (id: number | string) => ['edition', id] as const,
  editionDivisions: (editionId: number | string) =>
    ['editionDivisions', editionId] as const,
  schedule: (editionDivisionId: number | string) =>
    ['schedule', editionDivisionId] as const,
  standings: (editionDivisionId: number | string) =>
    ['standings', editionDivisionId] as const,
  branding: () => ['branding'] as const,
  lotteryLive: (lotteryId: number | string) =>
    ['lotteryLive', lotteryId] as const,
  editionLotteries: (editionId: number | string) =>
    ['editionLotteries', editionId] as const,
  editionLotteryRules: (
    editionId: number | string,
    editionDivisionId: number | null,
    lotteryId: number | string | null = null
  ) => ['editionLotteryRules', editionId, editionDivisionId, lotteryId] as const,
  editionLotteryPrizes: (lotteryId: number | string) =>
    ['editionLotteryPrizes', lotteryId] as const,
  editionLotteryPrizesWithLuckies: (
    editionId: number | string,
    editionDivisionId: number | null,
    lotteryId: number | string | null = null
  ) =>
    [
      'editionLotteryPrizesWithLuckies',
      editionId,
      editionDivisionId,
      lotteryId,
    ] as const,
  editionLotteryLuckies: (
    editionId: number | string,
    editionDivisionId: number | null
  ) => ['editionLotteryLuckies', editionId, editionDivisionId] as const,
  lotteryPrizesBoard: (lotteryId: number | string) =>
    ['lotteryPrizesBoard', lotteryId] as const,
  replacements: (editionDivisionId: number | string) =>
    ['replacements', editionDivisionId] as const,
  editionReplacements: (editionId: number | string) =>
    ['editionReplacements', editionId] as const,
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
