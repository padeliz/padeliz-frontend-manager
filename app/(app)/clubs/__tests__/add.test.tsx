import AddClubPage from '@/app/(app)/clubs/add';
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

jest.mock('@/services/api/clubsApi', () => ({
  ClubsApiService: jest.fn().mockImplementation(() => ({
    createClub: jest.fn(),
  })),
}));

describe('AddClubPage', () => {
  it('passes section breadcrumbs to ResourceCreatePage', () => {
    render(<AddClubPage />);
    expect(lastConfig.resourceName).toBe('Club');
    expect(lastConfig.sectionLabel).toBe('Clubs');
    expect(lastConfig.sectionHref).toBe('/clubs');
  });
});
