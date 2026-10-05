/**
 * @jest-environment jsdom
 */
import { ForeignKeyService } from '../foreignKeyService';

const mockGetMetadata = jest.fn();
const mockListResource = jest.fn();

jest.mock('@/services/api/resourceMetadataApi', () => ({
  ApiResourceMetadataApiService: jest.fn().mockImplementation(() => ({
    getApiResourceMetadata: (...args: unknown[]) => mockGetMetadata(...args),
  })),
}));

jest.mock('@/services/api/baseApi', () => ({
  BaseApiService: jest.fn().mockImplementation(() => ({
    listResource: (...args: unknown[]) => mockListResource(...args),
  })),
}));

describe('ForeignKeyService generic list options', () => {
  afterEach(() => {
    ForeignKeyService.clearCaches();
    jest.clearAllMocks();
  });

  it('loads options via GET /{resource_path} and caches by path', async () => {
    mockGetMetadata.mockResolvedValue({
      data: {
        version: 'v1',
        schema_name: 'Event',
        resource_path: 'events',
        display_field: 'name',
        swagger_schema: {
          required: [],
          properties: {
            id_event: {
              type: 'integer',
              format: 'int64',
              readOnly: true,
              description: 'Primary key',
            },
            name: { type: 'string' },
          },
        },
        filterable_fields: {},
        searchable_fields: ['name'],
        sortable_fields: ['name'],
        request_body: {},
      },
    });
    mockListResource.mockResolvedValue({
      data: [
        { id_event: 1, name: 'Summer' },
        { id_event: 2, name: 'Winter' },
      ],
    });

    const first = await ForeignKeyService.fetchLinkedResourceOptions(
      'Event',
      'name'
    );
    expect(first).toEqual([
      { id: 1, label: 'Summer' },
      { id: 2, label: 'Winter' },
    ]);
    expect(mockListResource).toHaveBeenCalledTimes(1);
    expect(mockListResource.mock.calls[0][0]).toMatch(/^\/events\?/);
    expect(mockListResource.mock.calls[0][0]).toContain('per_page=100');

    const second = await ForeignKeyService.fetchLinkedResourceOptions(
      'Event',
      'name'
    );
    expect(second).toEqual(first);
    expect(mockListResource).toHaveBeenCalledTimes(1);
  });
});
