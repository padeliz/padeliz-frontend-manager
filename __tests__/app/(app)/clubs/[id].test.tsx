import ViewClubPage from '@/app/(app)/clubs/[id]';
import { render } from '@testing-library/react-native';
import React from 'react';

let lastConfig: any;

jest.mock('@/components/pages/ResourceViewPage', () => ({
  __esModule: true,
  default: ({ config }: any) => {
    lastConfig = config;
    return null;
  },
}));

jest.mock('@/services/api/clubsApi', () => ({
  ClubsApiService: jest.fn().mockImplementation(() => ({
    getClub: jest.fn(),
    updateClub: jest.fn(),
  })),
}));

describe('ViewClubPage', () => {
  it('passes section breadcrumbs to ResourceViewPage', () => {
    render(<ViewClubPage />);
    expect(lastConfig.resourceName).toBe('Club');
    expect(lastConfig.sectionLabel).toBe('Clubs');
    expect(lastConfig.sectionHref).toBe('/clubs');
  });
});
