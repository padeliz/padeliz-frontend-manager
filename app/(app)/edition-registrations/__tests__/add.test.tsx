import AddEditionRegistrationPage from '@/app/(app)/edition-registrations/add';
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

jest.mock('@/services/api/editionRegistrationsApi', () => ({
  EditionRegistrationsApiService: jest.fn().mockImplementation(() => ({
    createRegistration: jest.fn(),
  })),
}));

describe('AddEditionRegistrationPage', () => {
  it('opts into query seeding without parsing edition_id itself', () => {
    render(<AddEditionRegistrationPage />);
    expect(lastConfig.seedFromQuery).toBe(true);
    expect(lastConfig.resourceName).toBe('EditionRegistration');
  });
});
