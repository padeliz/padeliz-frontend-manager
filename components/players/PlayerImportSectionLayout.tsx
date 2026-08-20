/**
 * Nested Import | Imports History tabs for player import sections.
 */

import { usePageChrome } from '@/components/chrome/PageChromeProvider';
import { confirmDiscardDirty } from '@/utils/softDirtyNav';
import { Slot, usePathname, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

type Props = {
  sectionSegment: 'import-players' | 'import-profile-images';
  importHref: string;
  importsHref: string;
};

export default function PlayerImportSectionLayout({
  sectionSegment,
  importHref,
  importsHref,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { actions } = usePageChrome();

  const onHistory = pathname.includes(`${sectionSegment}/imports`);
  const onImport = pathname.includes(sectionSegment) && !onHistory;

  const onBeforeNavigate = useCallback(async () => {
    if (!actions?.isDirty) return true;
    const ok = await confirmDiscardDirty();
    if (!ok) return false;
    actions.cancel?.();
    return true;
  }, [actions]);

  const navigate = useCallback(
    async (href: string) => {
      if (!(await onBeforeNavigate())) return;
      router.push(href as any);
    },
    [onBeforeNavigate, router]
  );

  const tabs = [
    { label: 'Import', href: importHref, active: onImport },
    { label: 'Imports History', href: importsHref, active: onHistory },
  ];

  return (
    <View className="flex-1">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="border-b border-gray-200 max-h-14"
        contentContainerStyle={{ paddingHorizontal: 8, alignItems: 'center' }}
      >
        {tabs.map(tab => (
          <Pressable
            key={tab.href}
            testID={`edition-tab-${tab.label}`}
            onPress={() => void navigate(tab.href)}
            className={`mx-1 px-3 py-2 rounded-lg ${
              tab.active ? 'bg-blue-600' : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                tab.active ? 'text-white' : 'text-gray-700'
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Slot />
    </View>
  );
}
