import { Redirect, useLocalSearchParams } from 'expo-router';

export default function LotteryIndex() {
  const { id, ed } = useLocalSearchParams<{ id: string; ed?: string }>();
  const q = ed ? `?ed=${ed}` : '';
  return <Redirect href={`/editions/${id}/lottery/prizes${q}` as any} />;
}
