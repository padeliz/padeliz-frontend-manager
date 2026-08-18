/**
 * Edition detail layout: chrome, ED picker, tabs, PageChrome.
 */

import { EditionChrome } from '@/components/editions/EditionDetailChrome';
import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import {
  parseLotteryId,
  withEdQuery,
  withLotteryQuery,
} from '@/utils/editionWorkspace';
import {
  Redirect,
  useGlobalSearchParams,
  useLocalSearchParams,
  usePathname,
} from 'expo-router';
import React from 'react';

export default function EditionIdLayout() {
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
  const editionId = localParams.id ?? globalParams.id;
  const edParam = globalParams.ed ?? localParams.ed;
  const lotteryParam = globalParams.lottery ?? localParams.lottery;
  const edNum =
    edParam != null
      ? Number(Array.isArray(edParam) ? edParam[0] : edParam)
      : null;
  const edId = edNum != null && Number.isFinite(edNum) ? edNum : null;
  const lotteryId = parseLotteryId(lotteryParam);

  if (
    editionId &&
    (pathname === `/editions/${editionId}` ||
      pathname === `/editions/${editionId}/`)
  ) {
    return (
      <Redirect
        href={
          withLotteryQuery(
            withEdQuery(`/editions/${editionId}/details`, edId),
            lotteryId
          ) as any
        }
      />
    );
  }

  return (
    <PageChromeProvider>
      <EditionChrome />
    </PageChromeProvider>
  );
}
