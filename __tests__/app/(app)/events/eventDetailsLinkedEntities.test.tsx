/**
 * @jest-environment jsdom
 */
import EventDetailsRoute from '@/app/(app)/events/[id]/details';
import fs from 'fs';
import path from 'path';
import { render } from '@testing-library/react-native';
import React from 'react';

let lastViewConfig: any;

jest.mock('@/components/pages/ResourceViewPage', () => ({
  __esModule: true,
  default: jest.fn(({ config }: any) => {
    lastViewConfig = config;
    const React = require('react');
    const { Text } = require('react-native');
    return <Text testID="event-details-view">view</Text>;
  }),
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: '36' }),
})
);

jest.mock('@/components/chrome/PageChromeProvider', () => ({
  useRegisterPageActions: jest.fn(),
}));

jest.mock('@/services/api/eventsApi', () => ({
  EventsApiService: jest.fn().mockImplementation(() => ({
    getEvent: jest.fn(),
    updateEvent: jest.fn(),
  })),
}));

describe('Event Details linked entities', () => {
  it('excludes the divisions linked entity, which has its own tab', () => {
    render(<EventDetailsRoute />);
    expect(lastViewConfig.resourceName).toBe('Event');
    expect(lastViewConfig.showLinkedEntities).toBe(true);
    expect(lastViewConfig.excludeLinkedEntities).toContain('divisions');
    expect(lastViewConfig.excludeLinkedEntities).toContain('event_divisions');
  });

  it('route wrapper uses View only without stray text nodes', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'app', '(app)', 'events', '[id]', 'details.tsx'),
      'utf8'
    );
    expect(src).not.toMatch(/>\s*\.\s*</);
    expect(src).not.toMatch(/ScrollView/);
  });
});
