/**
 * Edition detail layout: chrome, ED picker, tabs, PageChrome.
 */

import { EditionChrome } from '@/components/editions/EditionDetailChrome';
import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import { withEdQuery } from '@/utils/editionWorkspace';
import {
  Redirect,
  useGlobalSearchParams,
  useLocalSearchParams,
  usePathname,
} from 'expo-router';
import React from 'react';

export default function EditionIdLayout() {
  const localParams = useLocalSearchParams<{ id: string; ed?: string }>();
  const globalParams = useGlobalSearchParams<{ id?: string; ed?: string }>();
  const pathname = usePathname();
  const editionId = localParams.id ?? globalParams.id;
  const edParam = globalParams.ed ?? localParams.ed;
  const edNum =
    edParam != null
      ? Number(Array.isArray(edParam) ? edParam[0] : edParam)
      : null;
  const edId = edNum != null && Number.isFinite(edNum) ? edNum : null;

  if (
    editionId &&
    (pathname === `/editions/${editionId}` ||
      pathname === `/editions/${editionId}/`)
  ) {
    return (
      <Redirect
        href={withEdQuery(`/editions/${editionId}/details`, edId) as any}
      />
    );
  }

  return (
    <PageChromeProvider>
      <EditionChrome />
    </PageChromeProvider>
  );
}
