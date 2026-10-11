/**
 * Module-scoped metadata cache: second fetch for same schema skips network.
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react-native';

const mockGet = jest.fn();

jest.mock('@/services/api/resourceMetadataApi', () => ({
  ApiResourceMetadataApiService: jest.fn().mockImplementation(() => ({
    getApiResourceMetadata: (...args: unknown[]) => mockGet(...args),
  })),
}));

jest.mock('@/hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({ handleApiError: jest.fn() }),
}));

import {
  __resetResourceMetadataModuleCache,
  useResourceMetadata,
} from '../useResourceMetadata';

const userMeta = {
  version: 'v1',
  schema_name: 'User',
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
    mockGet.mockResolvedValue({ data: userMeta });
  });

  it('dedupes in-flight and reuses shared cache across hook instances', async () => {
    const { result: first, unmount } = renderHook(() =>
      useResourceMetadata(['User'])
    );

    await waitFor(() => {
      expect(first.current.getMetadata('User')).not.toBeNull();
    });
    expect(mockGet).toHaveBeenCalledTimes(1);

    unmount();

    const { result: second } = renderHook(() =>
      useResourceMetadata(['User'])
    );

    await waitFor(() => {
      expect(second.current.getMetadata('User')?.schema_name).toBe('User');
    });
    // Second mount should hit module cache — no extra network call
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});
