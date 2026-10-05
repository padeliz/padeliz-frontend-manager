import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ScheduleIndex() {
  const { id, ed } = useLocalSearchParams<{ id: string; ed?: string }>();
  const q = ed ? `?ed=${ed}` : '';
  return <Redirect href={`/events/${id}/schedule/knobs${q}` as any} />;
}
