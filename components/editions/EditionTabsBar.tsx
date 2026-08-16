/**
 * Href-driven edition tab strip (top or nested).
 */

import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text } from 'react-native';

export type EditionTabLink = {
  label: string;
  href: string;
  /** Path suffix to match active state, e.g. "/details" or "/schedule" */
  match: string;
  /** When set, press runs this instead of router.push (never pathname-active) */
  onPress?: () => void;
  /** Visual treatment; live = emerald CTA chip */
  variant?: 'default' | 'live';
};

type Props = {
  tabs: EditionTabLink[];
  /** Return false to cancel navigation (e.g. soft dirty) */
  onBeforeNavigate?: () => boolean | Promise<boolean>;
};

export default function EditionTabsBar({ tabs, onBeforeNavigate }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="border-b border-gray-200 max-h-14"
      contentContainerStyle={{ paddingHorizontal: 8, alignItems: 'center' }}
    >
      {tabs.map(tab => {
        const isAction = typeof tab.onPress === 'function';
        const isLive = tab.variant === 'live';
        const isActive = !isAction && pathname.includes(tab.match);
        return (
          <Pressable
            key={isAction ? `action-${tab.label}` : tab.href}
            testID={
              isLive
                ? 'open-live-lottery'
                : `edition-tab-${tab.label}`
            }
            onPress={() => {
              void (async () => {
                if (isAction) {
                  tab.onPress?.();
                  return;
                }
                if (onBeforeNavigate) {
                  const ok = await onBeforeNavigate();
                  if (!ok) return;
                }
                router.push(tab.href as any);
              })();
            }}
            className={`mx-1 px-3 py-2 rounded-lg ${
              isLive
                ? 'bg-emerald-600'
                : isActive
                  ? 'bg-blue-600'
                  : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                isLive || isActive ? 'text-white' : 'text-gray-700'
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
