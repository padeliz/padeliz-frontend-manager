/**
 * Read-only edition lottery list + validated ?lottery= selection.
 * URL writes are user-intent only (picker). Derive active id via lotteryQueryId.
 */

import { sortLotteriesByDisplayOrder } from '@/components/editions/editionLotteryUtils';
import { queryKeys } from '@/lib/queryClient';
import { EditionLotteriesApiService } from '@/services/api/editionLotteriesApi';
import { parseLotteryId } from '@/utils/editionWorkspace';
import { useQuery } from '@tanstack/react-query';
import {
  useGlobalSearchParams,
  useLocalSearchParams,
} from 'expo-router';
import { useMemo } from 'react';

const lotteriesApi = new EditionLotteriesApiService();

export function useEditionLotterySelection(editionId: number) {
  const localParams = useLocalSearchParams<{ lottery?: string }>();
  const globalParams = useGlobalSearchParams<{ lottery?: string }>();
  const lotteryParam = localParams.lottery ?? globalParams.lottery;

  const lotteriesQuery = useQuery({
    queryKey: queryKeys.editionLotteries(editionId),
    queryFn: async () => {
      const res = await lotteriesApi.getLotteries({
        per_page: 50,
        filters: { edition_id: editionId },
        sort_by: { display_order: 'asc' },
      });
      return res.data || [];
    },
    enabled: Number.isFinite(editionId),
  });

  const lotteriesLoaded =
    !lotteriesQuery.isLoading && lotteriesQuery.data !== undefined;
  // Normalize API ids once: PDO/JSON may yield string id_lottery; tab/picker
  // comparisons and effect deps must see stable numbers.
  const lotteries = useMemo(() => {
    const raw = lotteriesQuery.data || [];
    const normalized = raw.map(row => {
      const id = Number((row as { id_lottery?: unknown }).id_lottery);
      return Number.isFinite(id) ? { ...row, id_lottery: id } : row;
    });
    return sortLotteriesByDisplayOrder(normalized);
  }, [lotteriesQuery.data]);

  const rawLotteryId = parseLotteryId(lotteryParam);
  const lotteryId = lotteriesLoaded
    ? parseLotteryId(
        lotteryParam,
        lotteries.map(l => l.id_lottery)
      )
    : null;

  return {
    lotteries,
    lotteriesLoaded,
    lotteryId,
    rawLotteryId,
    isLoading: lotteriesQuery.isLoading,
  };
}
