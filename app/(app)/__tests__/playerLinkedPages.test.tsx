/**
 * @jest-environment jsdom
 */
import AddPlayerEmailPage from '@/app/(app)/player-emails/add';
import ViewPlayerEmailPage from '@/app/(app)/player-emails/[id]';
import PlayerEmailsPage from '@/app/(app)/player-emails/index';
import ViewPlayerIdentityPage from '@/app/(app)/player-identities/[id]';
import PlayerIdentitiesPage from '@/app/(app)/player-identities/index';
import AddPlayerPhonePage from '@/app/(app)/player-phones/add';
import ViewPlayerPhonePage from '@/app/(app)/player-phones/[id]';
import PlayerPhonesPage from '@/app/(app)/player-phones/index';
import { managerNavigationItems } from '@/components/layout/Sidebar';
import { render } from '@testing-library/react-native';
import fs from 'fs';
import path from 'path';
import React from 'react';

const mockPush = jest.fn();
let mockListConfig: any = null;
let mockCreateConfig: any = null;
let mockViewConfig: any = null;

const mockGetPhones = jest.fn();
const mockCreatePhone = jest.fn();
const mockUpdatePhone = jest.fn();
const mockGetPhone = jest.fn();
const mockBulkDeletePhones = jest.fn();
const mockGetEmails = jest.fn();
const mockCreateEmail = jest.fn();
const mockUpdateEmail = jest.fn();
const mockGetEmail = jest.fn();
const mockBulkDeleteEmails = jest.fn();
const mockGetIdentities = jest.fn();
const mockGetIdentity = jest.fn();
const mockUpdateIdentity = jest.fn();
const mockBulkDeleteIdentities = jest.fn();

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
    useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
    useLocalSearchParams: () => ({ id: '12' }),
  })
);

jest.mock('@/components/pages/ResourceListPage', () => ({
  __esModule: true,
  default: ({ config }: any) => {
    mockListConfig = config;
    return null;
  },
}));

jest.mock('@/components/pages/ResourceCreatePage', () => ({
  __esModule: true,
  default: ({ config }: any) => {
    mockCreateConfig = config;
    return null;
  },
}));

jest.mock('@/components/pages/ResourceViewPage', () => ({
  __esModule: true,
  default: ({ config }: any) => {
    mockViewConfig = config;
    return null;
  },
}));

jest.mock('@/services/api/playerPhonesApi', () => ({
  PlayerPhonesApiService: jest.fn().mockImplementation(() => ({
    getPhones: (...args: unknown[]) => mockGetPhones(...args),
    getPhone: (...args: unknown[]) => mockGetPhone(...args),
    createPhone: (...args: unknown[]) => mockCreatePhone(...args),
    updatePhone: (...args: unknown[]) => mockUpdatePhone(...args),
    bulkDeletePhones: (...args: unknown[]) => mockBulkDeletePhones(...args),
  })),
}));

jest.mock('@/services/api/playerEmailsApi', () => ({
  PlayerEmailsApiService: jest.fn().mockImplementation(() => ({
    getEmails: (...args: unknown[]) => mockGetEmails(...args),
    getEmail: (...args: unknown[]) => mockGetEmail(...args),
    createEmail: (...args: unknown[]) => mockCreateEmail(...args),
    updateEmail: (...args: unknown[]) => mockUpdateEmail(...args),
    bulkDeleteEmails: (...args: unknown[]) => mockBulkDeleteEmails(...args),
  })),
}));

jest.mock('@/services/api/playerIdentitiesApi', () => ({
  PlayerIdentitiesApiService: jest.fn().mockImplementation(() => ({
    getIdentities: (...args: unknown[]) => mockGetIdentities(...args),
    getIdentity: (...args: unknown[]) => mockGetIdentity(...args),
    updateIdentity: (...args: unknown[]) => mockUpdateIdentity(...args),
    bulkDeleteIdentities: (...args: unknown[]) =>
      mockBulkDeleteIdentities(...args),
  })),
}));

const APP_DIR = path.join(__dirname, '..');

beforeEach(() => {
  jest.clearAllMocks();
  mockListConfig = null;
  mockCreateConfig = null;
  mockViewConfig = null;
});

describe('Player phones pages (full CRUD)', () => {
  it('lists phones with add, view and bulk delete', async () => {
    mockGetPhones.mockResolvedValue({ data: [{ id_player_phone: 1 }], meta: {} });
    render(<PlayerPhonesPage />);

    expect(mockListConfig.resourceName).toBe('PlayerPhone');
    expect(mockListConfig.bulkActions.map((a: any) => a.action)).toContain(
      'delete'
    );

    const res = await mockListConfig.fetchData({ page: 2 });
    expect(mockGetPhones).toHaveBeenCalledWith({ page: 2 });
    expect(res.data).toEqual([{ id_player_phone: 1 }]);

    mockListConfig.onAdd();
    expect(mockPush).toHaveBeenCalledWith('/player-phones/add');
    mockListConfig.onView(5);
    expect(mockPush).toHaveBeenCalledWith('/player-phones/5');

    await mockListConfig.bulkDelete([3, 4]);
    expect(mockBulkDeletePhones).toHaveBeenCalledWith([3, 4]);
  });

  it('creates a phone through the create page', async () => {
    mockCreatePhone.mockResolvedValue({ data: { id_player_phone: 9 } });
    render(<AddPlayerPhonePage />);

    expect(mockCreateConfig.resourceName).toBe('PlayerPhone');
    await mockCreateConfig.createResource({ phone: '+40712345678' });
    expect(mockCreatePhone).toHaveBeenCalledWith({ phone: '+40712345678' });
    expect(mockCreateConfig.getViewPath(9)).toBe('/player-phones/9');
  });

  it('views and updates a phone by route id', async () => {
    render(<ViewPlayerPhonePage />);

    expect(mockViewConfig.resourceName).toBe('PlayerPhone');
    await mockViewConfig.fetchResource('12');
    expect(mockGetPhone).toHaveBeenCalledWith(12);
    await mockViewConfig.updateResource('12', { is_primary: true });
    expect(mockUpdatePhone).toHaveBeenCalledWith(12, { is_primary: true });
  });
});

describe('Player emails pages (full CRUD)', () => {
  it('lists emails with add, view and bulk delete', async () => {
    mockGetEmails.mockResolvedValue({ data: [{ id_player_email: 1 }], meta: {} });
    render(<PlayerEmailsPage />);

    expect(mockListConfig.resourceName).toBe('PlayerEmail');
    expect(mockListConfig.bulkActions.map((a: any) => a.action)).toContain(
      'delete'
    );

    const res = await mockListConfig.fetchData({ page: 1 });
    expect(mockGetEmails).toHaveBeenCalledWith({ page: 1 });
    expect(res.data).toEqual([{ id_player_email: 1 }]);

    mockListConfig.onAdd();
    expect(mockPush).toHaveBeenCalledWith('/player-emails/add');
    mockListConfig.onView(5);
    expect(mockPush).toHaveBeenCalledWith('/player-emails/5');

    await mockListConfig.bulkDelete([7]);
    expect(mockBulkDeleteEmails).toHaveBeenCalledWith([7]);
  });

  it('creates an email through the create page', async () => {
    mockCreateEmail.mockResolvedValue({ data: { id_player_email: 9 } });
    render(<AddPlayerEmailPage />);

    expect(mockCreateConfig.resourceName).toBe('PlayerEmail');
    await mockCreateConfig.createResource({ email: 'a@example.test' });
    expect(mockCreateEmail).toHaveBeenCalledWith({ email: 'a@example.test' });
    expect(mockCreateConfig.getViewPath(9)).toBe('/player-emails/9');
  });

  it('views and updates an email by route id', async () => {
    render(<ViewPlayerEmailPage />);

    expect(mockViewConfig.resourceName).toBe('PlayerEmail');
    await mockViewConfig.fetchResource('12');
    expect(mockGetEmail).toHaveBeenCalledWith(12);
    await mockViewConfig.updateResource('12', { is_primary: false });
    expect(mockUpdateEmail).toHaveBeenCalledWith(12, { is_primary: false });
  });
});

describe('Player identities pages (no create)', () => {
  it('lists identities with view and delete but no add', async () => {
    mockGetIdentities.mockResolvedValue({ data: [{ id_identity: 1 }], meta: {} });
    render(<PlayerIdentitiesPage />);

    expect(mockListConfig.resourceName).toBe('PlayerIdentity');
    expect(mockListConfig.onAdd).toBeUndefined();
    expect(mockListConfig.bulkActions.map((a: any) => a.action)).toContain(
      'delete'
    );

    const res = await mockListConfig.fetchData({ page: 1 });
    expect(mockGetIdentities).toHaveBeenCalledWith({ page: 1 });
    expect(res.data).toEqual([{ id_identity: 1 }]);

    mockListConfig.onView(5);
    expect(mockPush).toHaveBeenCalledWith('/player-identities/5');

    await mockListConfig.bulkDelete([2, 3]);
    expect(mockBulkDeleteIdentities).toHaveBeenCalledWith([2, 3]);
  });

  it('views and edits an identity but keeps the provider link read-only', async () => {
    render(<ViewPlayerIdentityPage />);

    expect(mockViewConfig.resourceName).toBe('PlayerIdentity');
    await mockViewConfig.fetchResource('12');
    expect(mockGetIdentity).toHaveBeenCalledWith(12);
    await mockViewConfig.updateResource('12', { display_name: 'Ace' });
    expect(mockUpdateIdentity).toHaveBeenCalledWith(12, { display_name: 'Ace' });

    expect(mockViewConfig.readOnlyFields).toEqual(
      expect.arrayContaining(['player_id', 'provider', 'provider_subject'])
    );
  });

  it('has index and [id] routes but no add route', () => {
    const dir = path.join(APP_DIR, 'player-identities');
    expect(fs.existsSync(path.join(dir, 'index.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(dir, '[id].tsx'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'add.tsx'))).toBe(false);
  });
});

describe('Player linked resource routes', () => {
  it.each(['player-phones', 'player-emails'])(
    '%s has index, [id] and add routes',
    resource => {
      const dir = path.join(APP_DIR, resource);
      expect(fs.existsSync(path.join(dir, 'index.tsx'))).toBe(true);
      expect(fs.existsSync(path.join(dir, '[id].tsx'))).toBe(true);
      expect(fs.existsSync(path.join(dir, 'add.tsx'))).toBe(true);
    }
  );

  it('adds no Sidebar entries for them', () => {
    const hrefs = managerNavigationItems.map(item => item.href);
    expect(hrefs).not.toContain('/player-phones');
    expect(hrefs).not.toContain('/player-emails');
    expect(hrefs).not.toContain('/player-identities');
  });
});
