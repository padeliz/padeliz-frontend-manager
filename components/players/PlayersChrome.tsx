/**
 * Players hub chrome: List | Import | Imports with Save/Refresh.
 */

import { usePageChrome } from '@/components/chrome/PageChromeProvider';
import EditionTabsBar, {
  EditionTabLink,
} from '@/components/editions/EditionTabsBar';
import AppLayout from '@/components/layout/AppLayout';
import { confirmDiscardDirty } from '@/utils/softDirtyNav';
import { Ionicons } from '@expo/vector-icons';
import { Slot, usePathname, useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

export function PlayersChrome() {
  const router = useRouter();
  const pathname = usePathname();
  const { actions } = usePageChrome();

  const tabs: EditionTabLink[] = useMemo(
    () => [
      { label: 'List', href: '/players/list', match: '/list' },
      { label: 'Import', href: '/players/import', match: '/import' },
      { label: 'Imports', href: '/players/imports', match: '/imports' },
    ],
    []
  );

  const discardIfNeeded = useCallback(async (): Promise<boolean> => {
    if (!actions?.isDirty) return true;
    const ok = await confirmDiscardDirty();
    if (!ok) return false;
    actions.cancel?.();
    return true;
  }, [actions]);

  const canSave = !!actions?.canSave;
  const showSave =
    pathname.split('/').includes('import') &&
    !pathname.split('/').includes('imports');

  return (
    <AppLayout title="Players">
      <View className="flex-1">
        <View className="flex-row items-center flex-wrap p-4 border-b border-gray-200 gap-2">
          <Pressable
            testID="players-chrome-back"
            onPress={() => router.push('/' as any)}
            className="mr-1 p-2"
          >
            <Ionicons name="arrow-back" size={24} color="#4b5563" />
          </Pressable>
          <View className="flex-1 min-w-[140px]">
            <Text className="text-lg font-semibold text-gray-900">Players</Text>
          </View>
          {showSave ? (
            <Pressable
              testID="players-chrome-save"
              onPress={() => void actions?.save?.()}
              disabled={!canSave || !!actions?.isSaving}
              className={`rounded-lg px-3 py-2 ${
                canSave && !actions?.isSaving ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <Text className="text-sm text-white font-medium">
                {actions?.isSaving ? 'Saving…' : 'Save'}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            testID="players-chrome-refresh"
            onPress={() => void actions?.refresh?.()}
            className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2"
          >
            <Text className="text-sm text-gray-700">Refresh</Text>
          </Pressable>
        </View>

        <EditionTabsBar tabs={tabs} onBeforeNavigate={discardIfNeeded} />

        <View className="flex-1">
          <Slot />
        </View>
      </View>
    </AppLayout>
  );
}
