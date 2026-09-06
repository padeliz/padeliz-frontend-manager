import { EditionChrome } from '@/components/editions/EditionDetailChrome';
import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/testing/createTestQueryClient';
import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockFinalizeEdition = jest.fn(async () => ({ data: {} }));
const mockGetEdition = jest.fn(async () => ({
  data: { id_edition: 1, name: 'Test Edition', finalized_at: null },
}));
const mockGetEditionDivisions = jest.fn(async () => ({ data: [] }));

jest.mock('@/services/api/editionsApi', () => ({
  EditionsApiService: jest.fn().mockImplementation(() => ({
    getEdition: (...args: unknown[]) => mockGetEdition(...args),
    finalizeEdition: (...args: unknown[]) => mockFinalizeEdition(...args),
  })),
}));

jest.mock('@/services/api/editionDivisionsApi', () => ({
  EditionDivisionsApiService: jest.fn().mockImplementation(() => ({
    getEditionDivisions: (...args: unknown[]) =>
      mockGetEditionDivisions(...args),
  })),
}));

jest.mock('@/lib/actionButtonFeedback', () => ({
  playSuccess: jest.fn(async () => undefined),
  playError: jest.fn(async () => undefined),
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
    useRouter: () => ({ replace: jest.fn(), back: jest.fn() }),
    usePathname: () => '/editions/1/details',
    useLocalSearchParams: () => ({ id: '1' }),
    useGlobalSearchParams: () => ({ id: '1' }),
    Slot: () => null,
    Redirect: () => null,
  })
);

jest.mock('@/components/layout/AppLayout', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return ({
    children,
    title,
    headerActions,
  }: {
    children: React.ReactNode;
    title?: string;
    headerActions?: React.ReactNode;
  }) => (
    <View>
      {title ? <Text>{title}</Text> : null}
      {headerActions}
      {children}
    </View>
  );
});

describe('EditionChrome finalize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).confirm = jest.fn(() => true);
    (window as any).addEventListener = jest.fn();
    (window as any).removeEventListener = jest.fn();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  function renderChrome() {
    const client = createTestQueryClient();
    return render(
      <QueryClientProvider client={client}>
        <PageChromeProvider>
          <EditionChrome />
        </PageChromeProvider>
      </QueryClientProvider>
    );
  }

  it('calls finalizeEdition when window.confirm returns true', async () => {
    (window as any).confirm = jest.fn(() => true);
    const { findByText } = renderChrome();
    fireEvent.press(await findByText('Finalize'));
    await waitFor(() => {
      expect(mockFinalizeEdition).toHaveBeenCalledWith(1);
    });
    expect((window as any).confirm).toHaveBeenCalled();
  });

  it('does not call finalizeEdition when window.confirm returns false', async () => {
    (window as any).confirm = jest.fn(() => false);
    const { findByText, queryByTestId } = renderChrome();
    fireEvent.press(await findByText('Finalize'));
    await waitFor(() => {
      expect((window as any).confirm).toHaveBeenCalled();
    });
    expect(mockFinalizeEdition).not.toHaveBeenCalled();
    expect(queryByTestId('edition-chrome-finalize-success')).toBeNull();
  });

  it('API reject shows error without Finalize failed Alert', async () => {
    mockFinalizeEdition.mockRejectedValueOnce(new Error('boom'));
    (window as any).confirm = jest.fn(() => true);
    const { findByText, findByTestId } = renderChrome();
    fireEvent.press(await findByText('Finalize'));
    await findByTestId('edition-chrome-finalize-error');
    expect(Alert.alert).not.toHaveBeenCalledWith(
      'Finalize failed',
      expect.anything()
    );
  });
});
