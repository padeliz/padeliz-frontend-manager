/**
 * Composable breadcrumbs: nested layouts/pages register segment groups by stable id.
 * Trail order follows depth (ascending), then registration order within the same depth.
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

type BreadcrumbContextValue = {
  items: BreadcrumbItem[];
  register: (id: string, items: BreadcrumbItem[], depth: number) => void;
  unregister: (id: string) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

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

  const value = useMemo(
    () => ({
      items: flattenGroups(groups, orderRef.current),
      register,
      unregister,
    }),
    [groups, register, unregister]
  );

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbTrail(): BreadcrumbItem[] {
  const ctx = useContext(BreadcrumbContext);
  return ctx?.items ?? [];
}

/**
 * Register breadcrumb segments for this hierarchy level while navigation-focused.
 * Unfocused stack screens unregister on blur so trails do not accumulate.
 * @param depth - Lower depth renders earlier in the trail (parent chrome = 0, nested sub-tab = 1).
 * Safe no-op outside BreadcrumbProvider.
 */
export function useBreadcrumbSegments(
  id: string,
  items: BreadcrumbItem[],
  depth = 0
) {
  const ctx = useContext(BreadcrumbContext);
  const register = ctx?.register;
  const unregister = ctx?.unregister;
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
