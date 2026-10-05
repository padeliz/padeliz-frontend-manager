/**
 * Read-only event lottery list + validated ?lottery= selection.
 * URL writes are user-intent only (picker). Derive active id via lotteryQueryId.
 */

import { sortLotteriesByDisplayOrder } from '@/components/events/eventLotteryUtils';
import { queryKeys } from '@/lib/queryClient';
import { EventLotteriesApiService } from '@/services/api/eventLotteriesApi';
import { parseLotteryId } from '@/utils/eventWorkspace';
import { useQuery } from '@tanstack/react-query';
import {
  useGlobalSearchParams,
  useLocalSearchParams,
} from 'expo-router';
import { useMemo } from 'react';

const lotteriesApi = new EventLotteriesApiService();

export function useEventLotterySelection(eventId: number) {
  const localParams = useLocalSearchParams<{ lottery?: string }>();
  const globalParams = useGlobalSearchParams<{ lottery?: string }>();
  const lotteryParam = localParams.lottery ?? globalParams.lottery;

  const lotteriesQuery = useQuery({
    queryKey: queryKeys.eventLotteries(eventId),
    queryFn: async () => {
      const res = await lotteriesApi.getLotteries({
        per_page: 50,
        filters: { event_id: eventId },
        sort_by: { display_order: 'asc' },
      });
      return res.data || [];
    },
    enabled: Number.isFinite(eventId),
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
