/**
 * Nested Import | Imports History tabs for player import sections.
 */

import { usePageChrome } from '@/components/chrome/PageChromeProvider';
import type { EditionTabLink } from '@/components/editions/EditionTabsBar';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import { useSubTabBar } from '@/components/layout/SubTabBarProvider';
import { findActiveEditionTabLabel } from '@/utils/editionTabMatch';
import { confirmDiscardDirty } from '@/utils/softDirtyNav';
import { Slot, usePathname } from 'expo-router';
import React, { useCallback, useMemo } from 'react';

type Props = {
  sectionSegment:
    | 'import-players'
    | 'import-profile-images'
    | 'import-custom-field-values';
  importHref: string;
  importsHref: string;
};

export default function PlayerImportSectionLayout({
  sectionSegment,
  importHref,
  importsHref,
}: Props) {
  const pathname = usePathname();
  const { actions } = usePageChrome();

  const onHistory = pathname.includes(`${sectionSegment}/imports`);

  const onBeforeNavigate = useCallback(async () => {
    if (!actions?.isDirty) return true;
    const ok = await confirmDiscardDirty();
    if (!ok) return false;
    actions.cancel?.();
    return true;
  }, [actions]);

  const tabs = useMemo((): EditionTabLink[] => {
    return [
      {
        label: 'Import',
        href: importHref,
        match: sectionSegment,
        matchExact: true,
      },
      {
        label: 'Imports History',
        href: importsHref,
        match: 'imports',
      },
    ];
  }, [importHref, importsHref, sectionSegment]);

  const subTabLabel =
    findActiveEditionTabLabel(pathname, tabs) ??
    (onHistory ? 'Imports History' : 'Import');
  useBreadcrumbSegments(
    `player-import-${sectionSegment}`,
    [{ label: subTabLabel }],
    1
  );

  useSubTabBar(`player-import-${sectionSegment}`, tabs, onBeforeNavigate);

  return <Slot />;
}
