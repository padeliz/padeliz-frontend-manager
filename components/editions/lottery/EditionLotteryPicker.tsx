/**
 * Chrome lottery picker: selectable list with View-all footer.
 * Selection is derived (no mount URL sync); URL writes only on user select.
 */

import { sortLotteriesByDisplayOrder } from '@/components/editions/editionLotteryUtils';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import { useEditionLotterySelection } from '@/hooks/useEditionLotterySelection';
import { openInNewWindow } from '@/utils/openInNewWindow';
import { lotteryQueryId } from '@/utils/edition/lotteryUrlSync';
import {
  withEdQuery,
  withLotteryQuery,
} from '@/utils/editionWorkspace';
import {
  useGlobalSearchParams,
  useLocalSearchParams,
  usePathname,
  useRouter,
} from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

type Props = {
  editionId: number;
};

export default function EditionLotteryPicker({ editionId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const localParams = useLocalSearchParams<{ ed?: string }>();
  const globalParams = useGlobalSearchParams<{ ed?: string }>();
  const edParam = localParams.ed ?? globalParams.ed;

  const { lotteries, lotteriesLoaded, lotteryId, rawLotteryId, isLoading } =
    useEditionLotterySelection(editionId);

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
          openInNewWindow('/edition-lotteries', () =>
            router.push('/edition-lotteries' as any)
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
    <View testID="edition-lottery-picker">
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
