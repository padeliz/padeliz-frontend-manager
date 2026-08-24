/**
 * Fixed sub-tab strip above AppLayout content scroll.
 * Nested layouts register tabs while mounted (breadcrumb-style hook).
 */

import EditionTabsBar, {
  type EditionTabLink,
} from '@/components/editions/EditionTabsBar';
import React, {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { View } from 'react-native';

type SubTabEntry = {
  id: string;
  tabs: EditionTabLink[];
  onBeforeNavigate?: () => Promise<boolean>;
};

type SubTabBarContextValue = {
  entry: SubTabEntry | null;
  register: (
    id: string,
    tabs: EditionTabLink[],
    onBeforeNavigate?: () => Promise<boolean>
  ) => void;
  unregister: (id: string) => void;
};

const SubTabBarContext = createContext<SubTabBarContextValue | null>(null);

function tabsEqual(a: EditionTabLink[], b: EditionTabLink[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (tab, i) =>
      tab.label === b[i].label &&
      tab.href === b[i].href &&
      tab.match === b[i].match &&
      tab.matchExact === b[i].matchExact &&
      tab.variant === b[i].variant &&
      tab.onPress === b[i].onPress
  );
}

export function SubTabBarProvider({ children }: { children: React.ReactNode }) {
  const [entry, setEntry] = useState<SubTabEntry | null>(null);

  const register = useCallback(
    (
      id: string,
      tabs: EditionTabLink[],
      onBeforeNavigate?: () => Promise<boolean>
    ) => {
      setEntry(prev => {
        if (
          prev?.id === id &&
          tabsEqual(prev.tabs, tabs) &&
          prev.onBeforeNavigate === onBeforeNavigate
        ) {
          return prev;
        }
        return { id, tabs, onBeforeNavigate };
      });
    },
    []
  );

  const unregister = useCallback((id: string) => {
    setEntry(prev => (prev?.id === id ? null : prev));
  }, []);

  const value = useMemo(
    () => ({ entry, register, unregister }),
    [entry, register, unregister]
  );

  return (
    <SubTabBarContext.Provider value={value}>
      {children}
    </SubTabBarContext.Provider>
  );
}

export function useSubTabBarTrail(): React.ReactNode {
  const ctx = useContext(SubTabBarContext);
  const entry = ctx?.entry;

  if (!entry?.tabs.length) return null;

  return (
    <View testID="app-sub-tab-bar">
      <EditionTabsBar
        tabs={entry.tabs}
        onBeforeNavigate={entry.onBeforeNavigate}
      />
    </View>
  );
}

/**
 * Register sub-tabs for this nested layout while mounted.
 * Safe no-op outside SubTabBarProvider.
 */
export function useSubTabBar(
  id: string,
  tabs: EditionTabLink[],
  onBeforeNavigate?: () => Promise<boolean>
) {
  const ctx = useContext(SubTabBarContext);
  const register = ctx?.register;
  const unregister = ctx?.unregister;
  const tabsSignature = tabs
    .map(
      t =>
        `${t.label}|${t.href}|${t.match}|${t.matchExact ?? ''}|${t.variant ?? ''}|${typeof t.onPress}`
    )
    .join(';');

  useLayoutEffect(() => {
    if (!register || !unregister) return;
    register(id, tabs, onBeforeNavigate);
    return () => unregister(id);
    // tabs read from closure when tabsSignature changes
  }, [id, tabsSignature, onBeforeNavigate, register, unregister]);
}
