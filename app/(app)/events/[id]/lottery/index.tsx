import { parseLotteryId, withEdQuery, withLotteryQuery } from '@/utils/eventWorkspace';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function LotteryIndex() {
  const { id, ed, lottery } = useLocalSearchParams<{
    id: string;
    ed?: string;
    lottery?: string;
  }>();
  const href = withLotteryQuery(
    withEdQuery(`/events/${id}/lottery/prizes`, parseLotteryId(ed)),
    parseLotteryId(lottery)
  );
  return <Redirect href={href as any} />;
}
