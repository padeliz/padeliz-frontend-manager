import EventRegistrationsPage from '@/app/(app)/event-registrations/index';
import { render } from '@testing-library/react-native';
import React from 'react';

let lastConfig: any;

jest.mock('@/components/pages/ResourceListPage', () => ({
  __esModule: true,
  default: ({ config }: any) => {
    lastConfig = config;
    return null;
  },
}));

jest.mock('@/services/api/eventRegistrationsApi', () => ({
  EventRegistrationsApiService: jest.fn().mockImplementation(() => ({
    getRegistrations: jest.fn(),
  })),
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
    useRouter: () => ({ push: jest.fn() }),
  })
);

describe('EventRegistrationsPage', () => {
  it('offers no hard-delete control — cancel/decline live on the detail page', () => {
    render(<EventRegistrationsPage />);
    expect(lastConfig.bulkDelete).toBeUndefined();
    expect(
      lastConfig.bulkActions.map((action: any) => action.action)
    ).not.toContain('delete');
    expect(
      lastConfig.bulkActions.map((action: any) => action.action)
    ).toContain('export');
  });
});
