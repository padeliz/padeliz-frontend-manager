/**
 * Page chrome: parent layout Save/Refresh/headerActions registration for nested routes.
 *
 * Actions live in a mutable actionsRef. useSyncExternalStore publishes a monotonic
 * version number so getSnapshot() stays Object.is-stable until scalar chrome fields
 * change (React 19 uSES contract). Handler-only updates refresh actionsRef without
 * bumping version or forcing subscriber re-renders.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

export type PageChromeActions = {
  save?: () => Promise<void>;
  refresh?: () => Promise<void>;
  edit?: () => void;
  cancel?: () => void;
  isEditing?: boolean;
  isSaving?: boolean;
  isRefreshing?: boolean;
  canSave?: boolean;
  isDirty?: boolean;
  /** Child-owned Page Header action cluster (list Add/Export, etc.). */
  headerActions?: React.ReactNode;
  /**
   * Bump when headerActions content should refresh the parent
   * (e.g. selected row count). Avoids infinite loops from new React node identities.
   */
  headerActionsKey?: string | number;
  /** Optional entity label for parent Page Header (e.g. Player detail). */
  displayTitle?: string | null;
};

type PageChromeCommands = {
  register: (actions: PageChromeActions | null) => void;
};

type PageChromeStore = {
  subscribe: (onStoreChange: () => void) => () => void;
  /** Monotonic version; Object.is-stable until scalar chrome fields change. */
  getSnapshot: () => number;
};

const PageChromeCommandsContext = createContext<PageChromeCommands | null>(
  null
);
const PageChromeStoreContext = createContext<PageChromeStore | null>(null);
const PageChromeActionsRefContext =
  createContext<React.MutableRefObject<PageChromeActions | null> | null>(null);

/** Scalar fields that should cause usePageChrome subscribers to re-render. */
function scalarsEqual(
  prev: PageChromeActions | null,
  next: PageChromeActions | null
): boolean {
  if (prev === next) return true;
  if (!prev && !next) return true;
  if (!prev || !next) return false;
  return (
    prev.isEditing === next.isEditing &&
    prev.isSaving === next.isSaving &&
    prev.isRefreshing === next.isRefreshing &&
    prev.canSave === next.canSave &&
    prev.isDirty === next.isDirty &&
    prev.headerActionsKey === next.headerActionsKey &&
    prev.displayTitle === next.displayTitle &&
    !!prev.save === !!next.save &&
    !!prev.refresh === !!next.refresh &&
    !!prev.edit === !!next.edit &&
    !!prev.cancel === !!next.cancel
  );
}

export function PageChromeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const actionsRef = useRef<PageChromeActions | null>(null);
  /** Last payload whose scalars were published (for scalarsEqual). */
  const notifiedRef = useRef<PageChromeActions | null>(null);
  const versionRef = useRef(0);
  const listenersRef = useRef(new Set<() => void>());

  const subscribe = useCallback((onStoreChange: () => void) => {
    listenersRef.current.add(onStoreChange);
    return () => {
      listenersRef.current.delete(onStoreChange);
    };
  }, []);

  const getSnapshot = useCallback(() => versionRef.current, []);

  const register = useCallback((next: PageChromeActions | null) => {
    actionsRef.current = next;
    if (scalarsEqual(notifiedRef.current, next)) return;
    notifiedRef.current = next;
    versionRef.current += 1;
    listenersRef.current.forEach(listener => listener());
  }, []);

  const commands = useMemo(() => ({ register }), [register]);
  const store = useMemo(
    () => ({ subscribe, getSnapshot }),
    [subscribe, getSnapshot]
  );

  return (
    <PageChromeActionsRefContext.Provider value={actionsRef}>
      <PageChromeCommandsContext.Provider value={commands}>
        <PageChromeStoreContext.Provider value={store}>
          {children}
        </PageChromeStoreContext.Provider>
      </PageChromeCommandsContext.Provider>
    </PageChromeActionsRefContext.Provider>
  );
}

export function usePageChrome() {
  const store = useContext(PageChromeStoreContext);
  const actionsRef = useContext(PageChromeActionsRefContext);
  if (!store || !actionsRef) {
    throw new Error('usePageChrome must be used within PageChromeProvider');
  }
  const version = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
  void version;
  return { actions: actionsRef.current };
}

/**
 * Stable actions ref for dirty-gates / layout readers that must not re-render
 * when registered page actions change.
 */
export function usePageChromeActionsRef(): React.MutableRefObject<PageChromeActions | null> {
  const actionsRef = useContext(PageChromeActionsRefContext);
  if (!actionsRef) {
    throw new Error(
      'usePageChromeActionsRef must be used within PageChromeProvider'
    );
  }
  return actionsRef;
}

/** True when nested under PageChromeProvider (safe outside provider). */
export function useHasPageChrome(): boolean {
  return useContext(PageChromeCommandsContext) != null;
}

/**
 * Imperative register (tests / rare cases). Prefer useRegisterPageActions in UI.
 */
export function usePageChromeRegister(): (
  actions: PageChromeActions | null
) => void {
  const commands = useContext(PageChromeCommandsContext);
  if (!commands) {
    throw new Error(
      'usePageChromeRegister must be used within PageChromeProvider'
    );
  }
  return commands.register;
}

const noopRegister = (_next: PageChromeActions | null) => {};

export function useRegisterPageActions(actions: PageChromeActions | null) {
  const commands = useContext(PageChromeCommandsContext);
  const register = commands?.register ?? noopRegister;
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const headerActionsRef = useRef(actions?.headerActions);
  headerActionsRef.current = actions?.headerActions;

  const save = useCallback(async () => {
    await actionsRef.current?.save?.();
  }, []);
  const refresh = useCallback(async () => {
    await actionsRef.current?.refresh?.();
  }, []);
  const edit = useCallback(() => {
    actionsRef.current?.edit?.();
  }, []);
  const cancel = useCallback(() => {
    actionsRef.current?.cancel?.();
  }, []);

  const isEditing = actions?.isEditing;
  const isSaving = actions?.isSaving;
  const isRefreshing = actions?.isRefreshing;
  const canSave = actions?.canSave;
  const isDirty = actions?.isDirty;
  const displayTitle = actions?.displayTitle;
  const headerActionsKey = actions?.headerActionsKey;
  const hasActions = !!actions;

  useLayoutEffect(() => {
    if (!hasActions) {
      register(null);
      return;
    }
    register({
      save,
      refresh,
      edit,
      cancel,
      isEditing,
      isSaving,
      isRefreshing,
      canSave,
      isDirty,
      displayTitle,
      headerActionsKey,
      get headerActions() {
        return headerActionsRef.current;
      },
    });
  }, [
    register,
    hasActions,
    isEditing,
    isSaving,
    isRefreshing,
    canSave,
    isDirty,
    save,
    refresh,
    edit,
    cancel,
    displayTitle,
    headerActionsKey,
  ]);

  useEffect(() => {
    return () => register(null);
  }, [register]);
}
