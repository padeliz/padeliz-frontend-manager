/**
 * Composable breadcrumbs: nested layouts/pages register segment groups by stable id.
 * Trail order follows depth (ascending), then registration order within the same depth.
 *
 * Commands (register/unregister) are separated from state (items) so
 * registrars do not re-render when the trail updates.
 */

import type { BreadcrumbItem } from '@/components/layout/Breadcrumbs';
import { useFocusEffect } from '@react-navigation/native';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

type SegmentGroup = {
  id: string;
  items: BreadcrumbItem[];
  depth: number;
};

type BreadcrumbCommands = {
  register: (id: string, items: BreadcrumbItem[], depth: number) => void;
  unregister: (id: string) => void;
};

type BreadcrumbState = {
  items: BreadcrumbItem[];
};

const BreadcrumbCommandsContext = createContext<BreadcrumbCommands | null>(
  null
);
const BreadcrumbStateContext = createContext<BreadcrumbState | null>(null);

function sortGroups(groups: SegmentGroup[], order: string[]): SegmentGroup[] {
  return [...groups].sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth;
    return order.indexOf(a.id) - order.indexOf(b.id);
  });
}

function flattenGroups(groups: SegmentGroup[], order: string[]): BreadcrumbItem[] {
  return sortGroups(groups, order).flatMap(g => g.items);
}

function itemsEqual(a: BreadcrumbItem[], b: BreadcrumbItem[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (item, i) => item.label === b[i].label && item.href === b[i].href
  );
}

export function BreadcrumbProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [groups, setGroups] = useState<SegmentGroup[]>([]);
  const orderRef = useRef<string[]>([]);

  const register = useCallback(
    (id: string, items: BreadcrumbItem[], depth: number) => {
      setGroups(prev => {
        const existingIdx = prev.findIndex(g => g.id === id);
        if (existingIdx >= 0) {
          const existing = prev[existingIdx];
          if (
            itemsEqual(existing.items, items) &&
            existing.depth === depth
          ) {
            return prev;
          }
          const next = [...prev];
          next[existingIdx] = { id, items, depth };
          return next;
        }
        if (!orderRef.current.includes(id)) {
          orderRef.current = [...orderRef.current, id];
        }
        return [...prev, { id, items, depth }];
      });
    },
    []
  );

  const unregister = useCallback((id: string) => {
    orderRef.current = orderRef.current.filter(x => x !== id);
    setGroups(prev => prev.filter(g => g.id !== id));
  }, []);

  const commands = useMemo(
    () => ({ register, unregister }),
    [register, unregister]
  );

  const state = useMemo(
    () => ({
      items: flattenGroups(groups, orderRef.current),
    }),
    [groups]
  );

  return (
    <BreadcrumbCommandsContext.Provider value={commands}>
      <BreadcrumbStateContext.Provider value={state}>
        {children}
      </BreadcrumbStateContext.Provider>
    </BreadcrumbCommandsContext.Provider>
  );
}

export function useBreadcrumbTrail(): BreadcrumbItem[] {
  const ctx = useContext(BreadcrumbStateContext);
  return ctx?.items ?? [];
}

/**
 * Register breadcrumb segments for this hierarchy level while navigation-focused.
 * Unfocused stack screens unregister on blur so trails do not accumulate.
 * @param depth - Lower depth renders earlier in the trail (parent chrome = 0, nested sub-tab = 1).
 * Safe no-op outside BreadcrumbProvider.
 * Does not subscribe to trail items — only commands.
 */
export function useBreadcrumbSegments(
  id: string,
  items: BreadcrumbItem[],
  depth = 0
) {
  const commands = useContext(BreadcrumbCommandsContext);
  const register = commands?.register;
  const unregister = commands?.unregister;
  const itemsKey = JSON.stringify(items);

  useFocusEffect(
    useCallback(() => {
      if (!register || !unregister) return;
      const parsed: BreadcrumbItem[] = JSON.parse(itemsKey);
      register(id, parsed, depth);
      return () => unregister(id);
    }, [depth, id, itemsKey, register, unregister])
  );
}

export type { BreadcrumbItem };
