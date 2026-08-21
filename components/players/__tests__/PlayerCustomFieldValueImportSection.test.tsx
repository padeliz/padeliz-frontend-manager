/**
 * @jest-environment jsdom
 */
import PlayerImportSectionLayout from '@/components/players/PlayerImportSectionLayout';
import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

const mockPush = jest.fn();
const pathnameState = {
  value: '/players/import-custom-field-values',
};

jest.mock('expo-router', () => ({
  Slot: () => {
    const { Text } = require('react-native');
    return <Text testID="import-section-slot">slot</Text>;
  },
  usePathname: () => pathnameState.value,
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/utils/softDirtyNav', () => ({
  confirmDiscardDirty: jest.fn(async () => true),
}));

describe('PlayerImportSectionLayout custom field values', () => {
  beforeEach(() => {
    mockPush.mockClear();
    pathnameState.value = '/players/import-custom-field-values';
  });

  it('wires import-custom-field-values tabs', async () => {
    const { getByTestId } = render(
      <PageChromeProvider>
        <PlayerImportSectionLayout
          sectionSegment="import-custom-field-values"
          importHref="/players/import-custom-field-values"
          importsHref="/players/import-custom-field-values/imports"
        />
      </PageChromeProvider>
    );

    expect(getByTestId('edition-tab-Import')).toBeTruthy();
    expect(getByTestId('edition-tab-Imports History')).toBeTruthy();
    expect(getByTestId('import-section-slot')).toBeTruthy();

    pathnameState.value = '/players/import-custom-field-values/imports';
    fireEvent.press(getByTestId('edition-tab-Imports History'));

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(
        '/players/import-custom-field-values/imports'
      )
    );
  });
});
