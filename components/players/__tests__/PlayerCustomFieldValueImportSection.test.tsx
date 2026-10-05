/**
 * @jest-environment jsdom
 */
import PlayerImportSectionLayout from '@/components/players/PlayerImportSectionLayout';
import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import {
  SubTabBarProvider,
  useSubTabBarTrail,
} from '@/components/layout/SubTabBarProvider';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';

const mockPush = jest.fn();
const pathnameState = {
  value: '/players/import-custom-field-values',
};

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  Slot: () => {
    const { Text } = require('react-native');
    return <Text testID="import-section-slot">slot</Text>;
  },
  usePathname: () => pathnameState.value,
  useRouter: () => ({ push: mockPush }),
  Link: ({ children }: any) => children,
})
);

jest.mock('@/utils/softDirtyNav', () => ({
  confirmDiscardDirty: jest.fn(async () => true),
}));

function SubTabChrome() {
  return <View testID="subtab-chrome">{useSubTabBarTrail()}</View>;
}

describe('PlayerImportSectionLayout custom field values', () => {
  beforeEach(() => {
    mockPush.mockClear();
    pathnameState.value = '/players/import-custom-field-values';
  });

  it('wires import-custom-field-values tabs via useSubTabBar', async () => {
    const { getByTestId } = render(
      <SubTabBarProvider>
        <SubTabChrome />
        <PageChromeProvider>
          <PlayerImportSectionLayout
            sectionSegment="import-custom-field-values"
            importHref="/players/import-custom-field-values"
            importsHref="/players/import-custom-field-values/imports"
          />
        </PageChromeProvider>
      </SubTabBarProvider>
    );

    expect(getByTestId('event-tab-Import')).toBeTruthy();
    expect(getByTestId('event-tab-Imports History')).toBeTruthy();
    expect(getByTestId('import-section-slot')).toBeTruthy();

    pathnameState.value = '/players/import-custom-field-values/imports';
    fireEvent.press(getByTestId('event-tab-Imports History'));

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(
        '/players/import-custom-field-values/imports'
      )
    );
  });
});
