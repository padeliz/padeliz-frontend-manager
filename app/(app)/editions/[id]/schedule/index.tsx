import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ScheduleIndex() {
  const { id, ed } = useLocalSearchParams<{ id: string; ed?: string }>();
  const q = ed ? `?ed=${ed}` : '';
  return <Redirect href={`/editions/${id}/schedule/knobs${q}` as any} />;
}
