/**
 * Page chrome: parent layout Save/Refresh registration for nested routes.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type PageChromeActions = {
  save?: () => void | Promise<void>;
  refresh?: () => void | Promise<void>;
  edit?: () => void;
  cancel?: () => void;
  isEditing?: boolean;
  isSaving?: boolean;
  canSave?: boolean;
  isDirty?: boolean;
};

type PageChromeContextValue = {
  actions: PageChromeActions | null;
  register: (actions: PageChromeActions | null) => void;
};

const PageChromeContext = createContext<PageChromeContextValue | null>(null);

export function PageChromeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [actions, setActions] = useState<PageChromeActions | null>(null);

  const register = useCallback((next: PageChromeActions | null) => {
    setActions(prev => {
      if (prev === next) return prev;
      if (!prev && !next) return prev;
      if (!prev || !next) return next;
      if (
        prev.isEditing === next.isEditing &&
        prev.isSaving === next.isSaving &&
        prev.canSave === next.canSave &&
        prev.isDirty === next.isDirty &&
        prev.save === next.save &&
        prev.refresh === next.refresh &&
        prev.edit === next.edit &&
        prev.cancel === next.cancel
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      actions,
      register,
    }),
    [actions, register]
  );

  return (
    <PageChromeContext.Provider value={value}>
      {children}
    </PageChromeContext.Provider>
  );
}

export function usePageChrome() {
  const ctx = useContext(PageChromeContext);
  if (!ctx) {
    throw new Error('usePageChrome must be used within PageChromeProvider');
  }
  return ctx;
}

const noopRegister = (_next: PageChromeActions | null) => {};

export function useRegisterPageActions(actions: PageChromeActions | null) {
  const ctx = useContext(PageChromeContext);
  const register = ctx?.register ?? noopRegister;
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

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
  const canSave = actions?.canSave;
  const isDirty = actions?.isDirty;
  const hasActions = !!actions;

  useEffect(() => {
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
      canSave,
      isDirty,
    });
  }, [
    register,
    hasActions,
    isEditing,
    isSaving,
    canSave,
    isDirty,
    save,
    refresh,
    edit,
    cancel,
  ]);

  useEffect(() => {
    return () => register(null);
  }, [register]);
}
