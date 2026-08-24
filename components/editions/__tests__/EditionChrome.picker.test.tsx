import { EditionChrome } from '@/components/editions/EditionDetailChrome';
import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import { formatDisplayDate } from '@/utils/fieldFormatter';
import {
  createTestQueryClient,
  disposeTestQueryClient,
} from '@/testing/createTestQueryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react-native';

const mockGetEdition = jest.fn(async () => ({
  data: {
    id_edition: 1,
    name: 'Test Edition',
    date: '2026-08-24',
    finalized_at: null,
  },
}));
const mockGetEditionDivisions = jest.fn(async () => ({
  data: [
    {
      id_edition_division: 9,
      edition_id: 1,
      division_title: 'Open A',
    },
  ],
}));

jest.mock('@/services/api/editionsApi', () => ({
  EditionsApiService: jest.fn().mockImplementation(() => ({
    getEdition: (...args: unknown[]) => mockGetEdition(...args),
    finalizeEdition: jest.fn(),
  })),
}));

jest.mock('@/services/api/editionDivisionsApi', () => ({
  EditionDivisionsApiService: jest.fn().mockImplementation(() => ({
    getEditionDivisions: (...args: unknown[]) =>
      mockGetEditionDivisions(...args),
  })),
}));

let mockPathname = '/editions/1/details';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), back: jest.fn() }),
  usePathname: () => mockPathname,
  useLocalSearchParams: () => ({ id: '1' }),
  useGlobalSearchParams: () => ({ id: '1' }),
  Slot: () => null,
  Redirect: () => null,
}));

jest.mock('@/components/layout/AppLayout', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return ({
    children,
    title,
    description,
    headerActions,
  }: {
    children: React.ReactNode;
    title?: string;
    description?: string;
    headerActions?: React.ReactNode;
  }) => (
    <View>
      {title ? <Text testID="app-layout-title">{title}</Text> : null}
      {description ? (
        <Text testID="app-layout-description">{description}</Text>
      ) : null}
      {headerActions}
      {children}
    </View>
  );
});

function renderChrome() {
  const client = createTestQueryClient();
  const result = render(
    <QueryClientProvider client={client}>
      <PageChromeProvider>
        <EditionChrome />
      </PageChromeProvider>
    </QueryClientProvider>
  );
  return { ...result, client };
}

describe('EditionChrome ED picker visibility', () => {
  let activeClient: ReturnType<typeof createTestQueryClient> | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).addEventListener = jest.fn();
    (window as any).removeEventListener = jest.fn();
  });

  afterEach(async () => {
    cleanup();
    if (activeClient) {
      await disposeTestQueryClient(activeClient);
      activeClient = null;
    }
  });

  function mountChrome() {
    const mounted = renderChrome();
    activeClient = mounted.client;
    return mounted;
  }

  it('hides the ED picker on Details', async () => {
    mockPathname = '/editions/1/details';
    const { queryByTestId, findByText } = mountChrome();
    await findByText('Edition: Test Edition');
    expect(queryByTestId('edition-division-picker')).toBeNull();
  });

  it('hides the ED picker on Registrations', async () => {
    mockPathname = '/editions/1/registrations';
    const { queryByTestId, findByText } = mountChrome();
    await findByText('Edition: Test Edition');
    expect(queryByTestId('edition-division-picker')).toBeNull();
  });

  it('hides the ED picker on Divisions', async () => {
    mockPathname = '/editions/1/divisions';
    const { queryByTestId, findByText } = mountChrome();
    await findByText('Edition: Test Edition');
    expect(queryByTestId('edition-division-picker')).toBeNull();
  });

  it('shows the ED picker on Participations', async () => {
    mockPathname = '/editions/1/participations';
    const { findByTestId } = mountChrome();
    expect(await findByTestId('edition-division-picker')).toBeTruthy();
  });

  it('shows formatted edition date in Page Header description', async () => {
    mockPathname = '/editions/1/details';
    const { findByTestId, queryByText } = mountChrome();
    const expectedDate = formatDisplayDate('2026-08-24');
    expect(await findByTestId('app-layout-description')).toHaveTextContent(
      expectedDate
    );
    expect(queryByText(/ID 1/)).toBeNull();
  });
});
