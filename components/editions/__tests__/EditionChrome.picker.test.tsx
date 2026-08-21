import { EditionChrome } from '@/components/editions/EditionDetailChrome';
import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

const mockGetEdition = jest.fn(async () => ({
  data: { id_edition: 1, name: 'Test Edition', finalized_at: null },
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
  const { View } = require('react-native');
  return ({ children }: any) => <View>{children}</View>;
});

function renderChrome() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PageChromeProvider>
        <EditionChrome />
      </PageChromeProvider>
    </QueryClientProvider>
  );
}

describe('EditionChrome ED picker visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).addEventListener = jest.fn();
    (window as any).removeEventListener = jest.fn();
  });

  it('hides the ED picker on Details', async () => {
    mockPathname = '/editions/1/details';
    const { queryByTestId, findByText } = renderChrome();
    await findByText('Edition: Test Edition');
    expect(queryByTestId('edition-division-picker')).toBeNull();
  });

  it('hides the ED picker on Registrations', async () => {
    mockPathname = '/editions/1/registrations';
    const { queryByTestId, findByText } = renderChrome();
    await findByText('Edition: Test Edition');
    expect(queryByTestId('edition-division-picker')).toBeNull();
  });

  it('hides the ED picker on Divisions', async () => {
    mockPathname = '/editions/1/divisions';
    const { queryByTestId, findByText } = renderChrome();
    await findByText('Edition: Test Edition');
    expect(queryByTestId('edition-division-picker')).toBeNull();
  });

  it('shows the ED picker on Participations', async () => {
    mockPathname = '/editions/1/participations';
    const { findByTestId } = renderChrome();
    expect(await findByTestId('edition-division-picker')).toBeTruthy();
  });
});
