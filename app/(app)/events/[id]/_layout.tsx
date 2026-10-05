/**
 * Event detail layout: chrome, ED picker, tabs, PageChrome.
 */

import { EventChrome } from '@/components/events/EventDetailChrome';
import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import {
  parseLotteryId,
  withEdQuery,
  withLotteryQuery,
} from '@/utils/eventWorkspace';
import {
  Redirect,
  useGlobalSearchParams,
  useLocalSearchParams,
  usePathname,
} from 'expo-router';
import React from 'react';

export default function EventIdLayout() {
  const localParams = useLocalSearchParams<{
    id: string;
    ed?: string;
    lottery?: string;
  }>();
  const globalParams = useGlobalSearchParams<{
    id?: string;
    ed?: string;
    lottery?: string;
  }>();
  const pathname = usePathname();
  const eventId = localParams.id ?? globalParams.id;
  const edParam = globalParams.ed ?? localParams.ed;
  const lotteryParam = globalParams.lottery ?? localParams.lottery;
  const edNum =
    edParam != null
      ? Number(Array.isArray(edParam) ? edParam[0] : edParam)
      : null;
  const edId = edNum != null && Number.isFinite(edNum) ? edNum : null;
  const lotteryId = parseLotteryId(lotteryParam);

  if (
    eventId &&
    (pathname === `/events/${eventId}` ||
      pathname === `/events/${eventId}/`)
  ) {
    return (
      <Redirect
        href={
          withLotteryQuery(
            withEdQuery(`/events/${eventId}/details`, edId),
            lotteryId
          ) as any
        }
      />
    );
  }

  return (
    <PageChromeProvider>
      <EventChrome />
    </PageChromeProvider>
  );
}
