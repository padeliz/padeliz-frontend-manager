import {
  PageChromeProvider,
  useHasPageChrome,
  usePageChrome,
  usePageChromeActionsRef,
  usePageChromeRegister,
  useRegisterPageActions,
} from '@/components/chrome/PageChromeProvider';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import fs from 'fs';
import path from 'path';

function ActionsRefProbe() {
  usePageChromeActionsRef();
  return <Text testID="ref-ok">ok</Text>;
}

function PageChromeProbe() {
  usePageChrome();
  return <Text testID="chrome-ok">ok</Text>;
}

function ChromeActionsProbe() {
  const { actions } = usePageChrome();
  return (
    <Text testID="chrome-dirty">
      {actions?.isDirty ? 'dirty' : 'clean'}
    </Text>
  );
}

function ChromeCanSaveProbe() {
  const { actions } = usePageChrome();
  return (
    <Text testID="chrome-cansave">
      {actions?.canSave ? 'yes' : 'no'}
    </Text>
  );
}

function ChromeReaderRenderProbe({
  renderCountRef,
}: {
  renderCountRef: { current: number };
}) {
  renderCountRef.current += 1;
  const { actions } = usePageChrome();
  return (
    <Text testID="reader-renders">
      {String(renderCountRef.current)}|{actions?.isDirty ? 'dirty' : 'clean'}
    </Text>
  );
}

function HasPageChromeProbe() {
  const has = useHasPageChrome();
  return <Text testID="has-chrome">{has ? 'yes' : 'no'}</Text>;
}

function FlipRegistrar() {
  const [dirty, setDirty] = useState(false);
  useRegisterPageActions({
    isDirty: dirty,
    canSave: dirty,
    cancel: () => undefined,
  });
  return (
    <Pressable testID="flip-dirty" onPress={() => setDirty(true)}>
      <Text>flip</Text>
    </Pressable>
  );
}

function StableRegistrar({ renderCountRef }: { renderCountRef: { current: number } }) {
  renderCountRef.current += 1;
  useRegisterPageActions({
    isDirty: false,
    canSave: false,
    cancel: () => undefined,
  });
  return <Text testID="stable-registrar">stable</Text>;
}

function NonSubscriber({ renderCountRef }: { renderCountRef: { current: number } }) {
  renderCountRef.current += 1;
  return <Text testID="non-subscriber">{String(renderCountRef.current)}</Text>;
}

/** Registers equal-scalar payloads on demand (new object each press). */
function EqualScalarRegisterControls({
  saveRef,
}: {
  saveRef: { current: () => Promise<void> };
}) {
  const register = usePageChromeRegister();
  return (
    <Pressable
      testID="equal-scalar-register"
      onPress={() => {
        register({
          isDirty: false,
          canSave: false,
          cancel: () => undefined,
          save: () => saveRef.current(),
        });
      }}
    >
      <Text>register</Text>
    </Pressable>
  );
}

function SaveViaActionsRefProbe() {
  const actionsRef = usePageChromeActionsRef();
  return (
    <Pressable
      testID="run-save-ref"
      onPress={() => {
        void actionsRef.current?.save?.();
      }}
    >
      <Text>run</Text>
    </Pressable>
  );
}

function ParentRerenderShell({
  leafRenderCountRef,
  children,
}: {
  leafRenderCountRef: { current: number };
  children: React.ReactNode;
}) {
  const [tick, setTick] = useState(0);
  return (
    <View>
      <Text testID="parent-tick">{String(tick)}</Text>
      <Pressable testID="bump-parent" onPress={() => setTick(t => t + 1)}>
        <Text>bump</Text>
      </Pressable>
      <ChromeReaderRenderProbe renderCountRef={leafRenderCountRef} />
      {children}
    </View>
  );
}

describe('PageChromeProvider actionsRef', () => {
  it('does not use useState for actions; getSnapshot is numeric version', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'PageChromeProvider.tsx'),
      'utf8'
    );
    expect(src).not.toMatch(/useState\s*</);
    expect(src).not.toContain('setActions');
    expect(src).toContain('useSyncExternalStore');
    expect(src).toContain('versionRef');
    expect(src).toMatch(/getSnapshot:\s*\(\)\s*=>\s*number/);
    expect(src).toContain('function scalarsEqual');
    expect(src).toContain('!!prev.save === !!next.save');
    expect(src).not.toMatch(/prev\.save === next\.save/);
    expect(src).toMatch(
      /actionsRef\.current = next;\s*if \(scalarsEqual\(notifiedRef\.current, next\)\) return;/
    );
    expect(src).toContain('versionRef.current += 1');
    expect(src).not.toMatch(/snapshotRef\.current = next/);
  });

  it('does not re-render ref consumers when actions change; ref stays current', async () => {
    let refRenders = 0;
    let latestDirty: boolean | undefined;

    function RefRenderProbe() {
      refRenders += 1;
      const actionsRef = usePageChromeActionsRef();
      return (
        <View>
          <Text testID="ref-renders">{String(refRenders)}</Text>
          <Pressable
            testID="read-ref"
            onPress={() => {
              latestDirty = actionsRef.current?.isDirty;
            }}
          >
            <Text>read</Text>
          </Pressable>
        </View>
      );
    }

    const { getByTestId } = render(
      <PageChromeProvider>
        <RefRenderProbe />
        <ChromeActionsProbe />
        <FlipRegistrar />
      </PageChromeProvider>
    );

    await waitFor(() => {
      expect(getByTestId('chrome-dirty').props.children).toBe('clean');
    });
    fireEvent.press(getByTestId('read-ref'));
    expect(latestDirty).toBe(false);
    const afterMount = Number(getByTestId('ref-renders').props.children);

    await act(async () => {
      fireEvent.press(getByTestId('flip-dirty'));
    });

    await waitFor(() => {
      expect(getByTestId('chrome-dirty').props.children).toBe('dirty');
    });
    expect(Number(getByTestId('ref-renders').props.children)).toBe(afterMount);

    fireEvent.press(getByTestId('read-ref'));
    expect(latestDirty).toBe(true);
  });

  it('does not re-render non-subscriber children when a sibling flips isDirty', async () => {
    const nonSubRenders = { current: 0 };

    const { getByTestId } = render(
      <PageChromeProvider>
        <NonSubscriber renderCountRef={nonSubRenders} />
        <ChromeActionsProbe />
        <FlipRegistrar />
      </PageChromeProvider>
    );

    await waitFor(() => {
      expect(getByTestId('chrome-dirty').props.children).toBe('clean');
    });
    const afterMount = nonSubRenders.current;

    await act(async () => {
      fireEvent.press(getByTestId('flip-dirty'));
    });

    await waitFor(() => {
      expect(getByTestId('chrome-dirty').props.children).toBe('dirty');
    });
    expect(nonSubRenders.current).toBe(afterMount);
  });

  it('does not re-render stable registrars when a sibling flips isDirty', async () => {
    const stableRenders = { current: 0 };

    const { getByTestId } = render(
      <PageChromeProvider>
        <StableRegistrar renderCountRef={stableRenders} />
        <ChromeActionsProbe />
        <ChromeCanSaveProbe />
        <FlipRegistrar />
      </PageChromeProvider>
    );

    await waitFor(() => {
      expect(getByTestId('chrome-dirty').props.children).toBe('clean');
    });
    const afterMount = stableRenders.current;

    await act(async () => {
      fireEvent.press(getByTestId('flip-dirty'));
    });

    await waitFor(() => {
      expect(getByTestId('chrome-dirty').props.children).toBe('dirty');
      expect(getByTestId('chrome-cansave').props.children).toBe('yes');
    });
    expect(stableRenders.current).toBe(afterMount);
  });

  it('does not notify readers when dirty is already true and flip is a no-op', async () => {
    const readerRenders = { current: 0 };

    const { getByTestId } = render(
      <PageChromeProvider>
        <ChromeReaderRenderProbe renderCountRef={readerRenders} />
        <FlipRegistrar />
      </PageChromeProvider>
    );

    await act(async () => {
      fireEvent.press(getByTestId('flip-dirty'));
    });

    await waitFor(() => {
      expect(getByTestId('reader-renders').props.children).toContain('dirty');
    });
    const afterDirty = readerRenders.current;

    await act(async () => {
      fireEvent.press(getByTestId('flip-dirty'));
    });

    expect(readerRenders.current).toBe(afterDirty);
  });

  it('equal-scalar register does not re-render usePageChrome readers', async () => {
    const readerRenders = { current: 0 };
    const saveRef = { current: async () => {} };

    const { getByTestId } = render(
      <PageChromeProvider>
        <ChromeReaderRenderProbe renderCountRef={readerRenders} />
        <EqualScalarRegisterControls saveRef={saveRef} />
      </PageChromeProvider>
    );

    await act(async () => {
      fireEvent.press(getByTestId('equal-scalar-register'));
    });
    await waitFor(() => {
      expect(getByTestId('reader-renders').props.children).toContain('clean');
    });
    const afterFirst = readerRenders.current;

    await act(async () => {
      fireEvent.press(getByTestId('equal-scalar-register'));
      fireEvent.press(getByTestId('equal-scalar-register'));
    });

    expect(readerRenders.current).toBe(afterFirst);
  });

  it('equal-scalar register updates actionsRef handlers without reader re-render', async () => {
    const readerRenders = { current: 0 };
    const calls: string[] = [];
    const saveRef = {
      current: async () => {
        calls.push('v1');
      },
    };

    const { getByTestId } = render(
      <PageChromeProvider>
        <ChromeReaderRenderProbe renderCountRef={readerRenders} />
        <SaveViaActionsRefProbe />
        <EqualScalarRegisterControls saveRef={saveRef} />
      </PageChromeProvider>
    );

    await act(async () => {
      fireEvent.press(getByTestId('equal-scalar-register'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('run-save-ref'));
    });
    expect(calls).toEqual(['v1']);
    const afterFirst = readerRenders.current;

    saveRef.current = async () => {
      calls.push('v2');
    };
    await act(async () => {
      fireEvent.press(getByTestId('equal-scalar-register'));
    });
    expect(readerRenders.current).toBe(afterFirst);

    await act(async () => {
      fireEvent.press(getByTestId('run-save-ref'));
    });
    expect(calls).toEqual(['v1', 'v2']);
  });

  it('clears chrome on registrar unmount without update-depth loop', async () => {
    const readerRenders = { current: 0 };

    const { getByTestId, rerender } = render(
      <PageChromeProvider>
        <ChromeReaderRenderProbe renderCountRef={readerRenders} />
        <FlipRegistrar />
      </PageChromeProvider>
    );

    await act(async () => {
      fireEvent.press(getByTestId('flip-dirty'));
    });
    await waitFor(() => {
      expect(getByTestId('reader-renders').props.children).toContain('dirty');
    });
    const afterDirty = readerRenders.current;

    rerender(
      <PageChromeProvider>
        <ChromeReaderRenderProbe renderCountRef={readerRenders} />
      </PageChromeProvider>
    );

    await waitFor(() => {
      expect(getByTestId('reader-renders').props.children).toContain('clean');
    });
    expect(readerRenders.current).toBeLessThan(afterDirty + 5);
  });

  it('parent re-renders after equal-scalar register do not tear-loop', async () => {
    const leafRenders = { current: 0 };
    const saveRef = { current: async () => {} };

    const { getByTestId } = render(
      <PageChromeProvider>
        <ParentRerenderShell leafRenderCountRef={leafRenders}>
          <EqualScalarRegisterControls saveRef={saveRef} />
        </ParentRerenderShell>
      </PageChromeProvider>
    );

    await act(async () => {
      fireEvent.press(getByTestId('equal-scalar-register'));
      fireEvent.press(getByTestId('equal-scalar-register'));
    });
    const afterRegister = leafRenders.current;

    await act(async () => {
      for (let i = 0; i < 20; i += 1) {
        fireEvent.press(getByTestId('bump-parent'));
      }
    });

    expect(leafRenders.current).toBeLessThan(afterRegister + 25);
    expect(getByTestId('parent-tick').props.children).toBe('20');
  });

  it('useHasPageChrome is true inside provider and false outside', () => {
    const { getByTestId, unmount } = render(
      <PageChromeProvider>
        <HasPageChromeProbe />
      </PageChromeProvider>
    );
    expect(getByTestId('has-chrome').props.children).toBe('yes');
    unmount();

    const outside = render(<HasPageChromeProbe />);
    expect(outside.getByTestId('has-chrome').props.children).toBe('no');
  });

  it('throws outside PageChromeProvider', () => {
    expect(() => render(<ActionsRefProbe />)).toThrow(
      /usePageChromeActionsRef must be used within PageChromeProvider/
    );
  });

  it('usePageChrome throws outside PageChromeProvider', () => {
    expect(() => render(<PageChromeProbe />)).toThrow(
      /usePageChrome must be used within PageChromeProvider/
    );
  });
});
