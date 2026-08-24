import {
  PageChromeProvider,
  usePageChrome,
  useRegisterPageActions,
} from '@/components/chrome/PageChromeProvider';
import { render, waitFor } from '@testing-library/react-native';
import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

function ChromeProbe() {
  const { actions } = usePageChrome();
  return (
    <View>
      <Text testID="has-refresh">{actions?.refresh ? 'yes' : 'no'}</Text>
      <Text testID="display-title">{actions?.displayTitle ?? ''}</Text>
      <View testID="header-actions-slot">{actions?.headerActions}</View>
      <Pressable
        testID="trigger-refresh"
        onPress={() => void actions?.refresh?.()}
      />
    </View>
  );
}

function ChildRegistrar({
  title,
  withRefresh,
  actionLabel = 'Add',
  actionKey = 'add',
}: {
  title?: string;
  withRefresh?: boolean;
  actionLabel?: string;
  actionKey?: string;
}) {
  const refresh = React.useCallback(async () => {}, []);
  const headerActions = useMemo(
    () => <Text testID="child-action">{actionLabel}</Text>,
    [actionLabel]
  );
  useRegisterPageActions({
    refresh: withRefresh ? refresh : undefined,
    canSave: false,
    isDirty: false,
    displayTitle: title ?? null,
    headerActions,
    headerActionsKey: actionKey,
  });
  return <Text>child</Text>;
}

describe('PageChromeProvider headerActions / displayTitle', () => {
  it('registers headerActions and displayTitle and clears on unmount', async () => {
    const { getByTestId, queryByTestId, rerender } = render(
      <PageChromeProvider>
        <ChromeProbe />
        <ChildRegistrar title="Ace Club" withRefresh />
      </PageChromeProvider>
    );

    await waitFor(() => {
      expect(getByTestId('display-title').props.children).toBe('Ace Club');
      expect(getByTestId('child-action')).toBeTruthy();
      expect(getByTestId('has-refresh').props.children).toBe('yes');
    });

    rerender(
      <PageChromeProvider>
        <ChromeProbe />
      </PageChromeProvider>
    );

    await waitFor(() => {
      expect(getByTestId('display-title').props.children).toBe('');
      expect(queryByTestId('child-action')).toBeNull();
      expect(getByTestId('has-refresh').props.children).toBe('no');
    });
  });

  it('updates displayTitle when child re-registers', async () => {
    const { getByTestId, rerender } = render(
      <PageChromeProvider>
        <ChromeProbe />
        <ChildRegistrar title="7" withRefresh />
      </PageChromeProvider>
    );

    await waitFor(() => {
      expect(getByTestId('display-title').props.children).toBe('7');
    });

    rerender(
      <PageChromeProvider>
        <ChromeProbe />
        <ChildRegistrar title="Mara" withRefresh />
      </PageChromeProvider>
    );

    await waitFor(() => {
      expect(getByTestId('display-title').props.children).toBe('Mara');
    });
  });
});
