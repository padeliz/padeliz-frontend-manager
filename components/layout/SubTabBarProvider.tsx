/**
 * Fixed sub-tab strip above AppLayout content scroll.
 * Nested layouts register tabs while mounted (breadcrumb-style hook).
 *
 * Commands (register/unregister) are separated from state (entry) so
 * registrars do not re-render when the trail entry updates.
 */

import EditionTabsBar, {
  type EditionTabLink,
} from '@/components/editions/EditionTabsBar';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';

/** Data-only tab descriptor stored in entry (no function identity). */
type SubTabDescriptor = {
  label: string;
  href: string;
  match: string;
  matchExact?: boolean;
  variant?: 'default' | 'live';
  disabled?: boolean;
  hasOnPress: boolean;
};

type SubTabEntry = {
  id: string;
  tabs: SubTabDescriptor[];
};

type HandlerBox = {
  onBeforeNavigate?: () => Promise<boolean>;
  onPress: Record<string, (() => void) | undefined>;
};

type SubTabBarCommands = {
  register: (
    id: string,
    tabs: EditionTabLink[],
    onBeforeNavigate?: () => Promise<boolean>
  ) => void;
  unregister: (id: string) => void;
  /** Stable box; mutate .current fields in register, read in trail. */
  handlers: React.MutableRefObject<HandlerBox>;
};

type SubTabBarState = {
  entry: SubTabEntry | null;
};

const SubTabBarCommandsContext = createContext<SubTabBarCommands | null>(null);
const SubTabBarStateContext = createContext<SubTabBarState | null>(null);

function tabKey(tab: { label: string; href: string; variant?: string }): string {
  return tab.variant === 'live' ? `action-${tab.label}` : tab.href;
}

function toDescriptors(tabs: EditionTabLink[]): SubTabDescriptor[] {
  return tabs.map(t => ({
    label: t.label,
    href: t.href,
    match: t.match,
    matchExact: t.matchExact,
    variant: t.variant,
    // Coerce so omitted vs false never fail descriptorsEqual.
    disabled: !!t.disabled,
    hasOnPress: typeof t.onPress === 'function',
  }));
}

/** Stable content key for useLayoutEffect deps (ignore function identity). */
function descriptorsSignature(tabs: EditionTabLink[]): string {
  return toDescriptors(tabs)
    .map(
      t =>
        `${t.label}\0${t.href}\0${t.match}\0${t.matchExact ?? ''}\0${t.variant ?? ''}\0${t.disabled ? 1 : 0}\0${t.hasOnPress ? 1 : 0}`
    )
    .join('\n');
}

function descriptorsEqual(
  a: SubTabDescriptor[],
  b: SubTabDescriptor[]
): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (tab, i) =>
      tab.label === b[i].label &&
      tab.href === b[i].href &&
      tab.match === b[i].match &&
      tab.matchExact === b[i].matchExact &&
      tab.variant === b[i].variant &&
      tab.disabled === b[i].disabled &&
      tab.hasOnPress === b[i].hasOnPress
  );
}

export function SubTabBarProvider({ children }: { children: React.ReactNode }) {
  const [entry, setEntry] = useState<SubTabEntry | null>(null);
  const handlers = useRef<HandlerBox>({ onPress: {} });

  const register = useCallback(
    (
      id: string,
      tabs: EditionTabLink[],
      onBeforeNavigate?: () => Promise<boolean>
    ) => {
      handlers.current.onBeforeNavigate = onBeforeNavigate;
      const nextPress: Record<string, (() => void) | undefined> = {};
      for (const t of tabs) {
        if (typeof t.onPress === 'function') {
          nextPress[tabKey(t)] = t.onPress;
        }
      }
      handlers.current.onPress = nextPress;

      const descriptors = toDescriptors(tabs);
      setEntry(prev => {
        if (prev?.id === id && descriptorsEqual(prev.tabs, descriptors)) {
          return prev;
        }
        return { id, tabs: descriptors };
      });
    },
    []
  );

  const unregister = useCallback((id: string) => {
    setEntry(prev => {
      if (prev?.id !== id) return prev;
      handlers.current = { onPress: {} };
      return null;
    });
  }, []);

  const commands = useMemo(
    () => ({ register, unregister, handlers }),
    [register, unregister]
  );

  const state = useMemo(() => ({ entry }), [entry]);

  return (
    <SubTabBarCommandsContext.Provider value={commands}>
      <SubTabBarStateContext.Provider value={state}>
        {children}
      </SubTabBarStateContext.Provider>
    </SubTabBarCommandsContext.Provider>
  );
}

export function useSubTabBarTrail(): React.ReactNode {
  const state = useContext(SubTabBarStateContext);
  const commands = useContext(SubTabBarCommandsContext);
  const entry = state?.entry;
  const handlers = commands?.handlers;

  const tabs = useMemo((): EditionTabLink[] => {
    if (!entry?.tabs.length || !handlers) return [];
    return entry.tabs.map(t => {
      const key = tabKey(t);
      const link: EditionTabLink = {
        label: t.label,
        href: t.href,
        match: t.match,
        matchExact: t.matchExact,
        variant: t.variant,
        disabled: t.disabled,
      };
      if (t.hasOnPress) {
        link.onPress = () => {
          handlers.current.onPress[key]?.();
        };
      }
      return link;
    });
  }, [entry, handlers]);

  const onBeforeNavigate = useCallback(async () => {
    const gate = handlers?.current.onBeforeNavigate;
    if (!gate) return true;
    return gate();
  }, [handlers]);

  if (!tabs.length) return null;

  return (
    <View testID="app-sub-tab-bar">
      <EditionTabsBar tabs={tabs} onBeforeNavigate={onBeforeNavigate} />
    </View>
  );
}

/**
 * Register sub-tabs for this nested layout while mounted.
 * Safe no-op outside SubTabBarProvider.
 * Does not subscribe to entry — only commands.
 */
export function useSubTabBar(
  id: string,
  tabs: EditionTabLink[],
  onBeforeNavigate?: () => Promise<boolean>
) {
  const commands = useContext(SubTabBarCommandsContext);
  const register = commands?.register;
  const unregister = commands?.unregister;
  const handlers = commands?.handlers;
  const tabsRef = useRef(tabs);
  const onBeforeRef = useRef(onBeforeNavigate);
  tabsRef.current = tabs;
  onBeforeRef.current = onBeforeNavigate;

  // Keep press/dirty handlers fresh without setState (signature ignores fn identity).
  if (handlers) {
    handlers.current.onBeforeNavigate = onBeforeNavigate;
    const nextPress: Record<string, (() => void) | undefined> = {};
    for (const t of tabs) {
      if (typeof t.onPress === 'function') {
        nextPress[tabKey(t)] = t.onPress;
      }
    }
    handlers.current.onPress = nextPress;
  }

  // Depend on descriptor content, not tabs array identity — parent re-renders
  // with a new array must not re-arm layout setEntry.
  const signature = descriptorsSignature(tabs);

  useLayoutEffect(() => {
    if (!register) return;
    register(id, tabsRef.current, onBeforeRef.current);
  }, [id, signature, register]);

  useEffect(() => {
    if (!unregister) return;
    return () => unregister(id);
  }, [id, unregister]);
}
