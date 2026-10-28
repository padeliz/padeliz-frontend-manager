import AddEventRegistrationPage from '@/app/(app)/event-registrations/add';
import { render } from '@testing-library/react-native';
import React from 'react';

let lastConfig: any;

jest.mock('@/components/pages/ResourceCreatePage', () => ({
  __esModule: true,
  default: ({ config }: any) => {
    lastConfig = config;
    return null;
  },
}));

jest.mock('@/services/api/eventRegistrationsApi', () => ({
  EventRegistrationsApiService: jest.fn().mockImplementation(() => ({
    createRegistration: jest.fn(),
  })),
}));

describe('AddEventRegistrationPage', () => {
  it('opts into query seeding without parsing event_id itself', () => {
    render(<AddEventRegistrationPage />);
    expect(lastConfig.seedFromQuery).toBe(true);
    expect(lastConfig.resourceName).toBe('EventRegistration');
  });
});
