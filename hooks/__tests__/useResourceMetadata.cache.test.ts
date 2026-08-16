/**
 * Module-scoped metadata cache: second fetch for same schema skips network.
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react-native';

const mockGet = jest.fn();

jest.mock('@/services/api/resourceMetadataApi', () => ({
  ApiResourceMetadataApiService: jest.fn().mockImplementation(() => ({
    getApiResourceMetadata: (...args: unknown[]) => mockGet(...args),
    clearApiResourceMetadataCache: jest.fn(async () => ({})),
    clearAllMetadataCache: jest.fn(async () => ({})),
  })),
}));

jest.mock('@/hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({ handleApiError: jest.fn() }),
}));

import {
  __resetResourceMetadataModuleCache,
  useResourceMetadata,
} from '../useResourceMetadata';

const playerMeta = {
  version: 'v1',
  schema_name: 'Player',
  resource_path: 'players',
  swagger_schema: { required: [], properties: {} },
  request_body: {},
  searchable_fields: [],
  filterable_fields: {},
  sortable_fields: [],
};

describe('useResourceMetadata module cache', () => {
  beforeEach(() => {
    __resetResourceMetadataModuleCache();
    mockGet.mockReset();
    mockGet.mockResolvedValue({ data: playerMeta });
  });

  it('dedupes in-flight and reuses shared cache across hook instances', async () => {
    const { result: first, unmount } = renderHook(() =>
      useResourceMetadata(['Player'])
    );

    await waitFor(() => {
      expect(first.current.getMetadata('Player')).not.toBeNull();
    });
    expect(mockGet).toHaveBeenCalledTimes(1);

    unmount();

    const { result: second } = renderHook(() =>
      useResourceMetadata(['Player'])
    );

    await waitFor(() => {
      expect(second.current.getMetadata('Player')?.schema_name).toBe('Player');
    });
    // Second mount should hit module cache — no extra network call
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});
