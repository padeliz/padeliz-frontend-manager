/**
 * Chrome lottery picker: selectable list with View-all footer.
 * Selection is derived (no mount URL sync); URL writes only on user select.
 */

import { sortLotteriesByDisplayOrder } from '@/components/events/eventLotteryUtils';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import { useEventLotterySelection } from '@/hooks/useEventLotterySelection';
import { openInNewWindow } from '@/utils/openInNewWindow';
import { lotteryQueryId } from '@/utils/event/lotteryUrlSync';
import {
  withEdQuery,
  withLotteryQuery,
} from '@/utils/eventWorkspace';
import {
  useGlobalSearchParams,
  useLocalSearchParams,
  usePathname,
  useRouter,
} from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

type Props = {
  eventId: number;
};

export default function EventLotteryPicker({ eventId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const localParams = useLocalSearchParams<{ ed?: string }>();
  const globalParams = useGlobalSearchParams<{ ed?: string }>();
  const edParam = localParams.ed ?? globalParams.ed;

  const { lotteries, lotteriesLoaded, lotteryId, rawLotteryId, isLoading } =
    useEventLotterySelection(eventId);

  const selectedLotteryId = lotteryQueryId({
    lotteriesLoaded,
    lotteries,
    lotteryId,
    rawLotteryId,
  });

  const edKeep = useMemo(() => {
    if (edParam == null) return null;
    const raw = Array.isArray(edParam) ? edParam[0] : edParam;
    const id = Number(raw);
    return Number.isFinite(id) ? id : null;
  }, [edParam]);

  const navigateLottery = (id: number | null) => {
    router.replace(
      withLotteryQuery(withEdQuery(pathname, edKeep), id) as any
    );
  };

  const options = useMemo(
    () =>
      sortLotteriesByDisplayOrder(lotteries).map(l => ({
        label: l.name?.trim() ? l.name : `Lottery #${l.id_lottery}`,
        value: l.id_lottery,
      })),
    [lotteries]
  );

  const footer = (
    <View className="flex-row justify-end">
      <Pressable
        testID="lottery-picker-view-all"
        onPress={() => {
          openInNewWindow('/event-lotteries', () =>
            router.push('/event-lotteries' as any)
          );
        }}
        className="px-3 py-2"
      >
        <Text className="text-sm font-medium text-blue-600">View all</Text>
      </Pressable>
    </View>
  );

  if (isLoading && !lotteriesLoaded) {
    return <ActivityIndicator testID="lottery-picker-loading" />;
  }

  return (
    <View testID="event-lottery-picker">
      <SingleSelectDropdown
        options={options}
        selectedValue={selectedLotteryId}
        onSelectionChange={v => {
          const n = Number(v);
          if (!Number.isFinite(n)) return;
          navigateLottery(n);
        }}
        placeholder={
          options.length === 0 ? 'No lotteries' : 'Select lottery'
        }
        title="Lottery"
        minWidth={220}
        footer={footer}
      />
    </View>
  );
}
