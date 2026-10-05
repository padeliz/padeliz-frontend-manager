import { ApiResourceMetadata } from '@/types/api/metadata';
import { seedFormValuesFromQuery } from '@/utils/seedFormValuesFromQuery';

function metadata(
  properties: Record<string, any>
): ApiResourceMetadata {
  return {
    version: '1',
    schema_name: 'EventRegistration',
    resource_path: 'event-registrations',
    swagger_schema: {
      required: [],
      properties,
    },
    request_body: {},
    searchable_fields: [],
    filterable_fields: {},
    sortable_fields: [],
  };
}

const baseProperties = {
  id_registration: { type: 'integer', format: 'int64', readOnly: true },
  event_id: { type: 'integer', format: 'int64' },
  player_id: { type: 'integer', format: 'int64' },
  is_minor: { type: 'boolean' },
  note: { type: 'string', nullable: true },
  status: { type: 'string', readOnly: true },
  player: { $ref: '#/components/schemas/Player' },
  tags: { type: 'array', items: { type: 'string' } },
  url: {
    type: 'string',
    readOnly: true,
    'x-padeliz-upload': {
      mode: 'single',
      max_files: 1,
      max_size_kb: 1024,
      accept: ['image/png'],
      form_field: 'file',
      upload: { method: 'POST', path: '/media' },
    },
  },
};

describe('seedFormValuesFromQuery', () => {
  it('returns empty when seedFromQuery is off', () => {
    expect(
      seedFormValuesFromQuery(
        { event_id: '4' },
        metadata(baseProperties),
        { seedFromQuery: false }
      )
    ).toEqual({});
    expect(
      seedFormValuesFromQuery({ event_id: '4' }, metadata(baseProperties), {})
    ).toEqual({});
  });

  it('accepts writable schema fields when seedFromQuery is true', () => {
    expect(
      seedFormValuesFromQuery(
        { event_id: '4', player_id: '9', is_minor: '1' },
        metadata(baseProperties),
        { seedFromQuery: true }
      )
    ).toEqual({ event_id: 4, player_id: 9, is_minor: true });
  });

  it('intersects a string[] allowlist with writable fields', () => {
    expect(
      seedFormValuesFromQuery(
        { event_id: '4', player_id: '9' },
        metadata(baseProperties),
        { seedFromQuery: ['event_id'] }
      )
    ).toEqual({ event_id: 4 });
  });

  it('ignores unknown, readOnly, PK, nested, and upload keys', () => {
    expect(
      seedFormValuesFromQuery(
        {
          unknown: 'x',
          status: 'open',
          id_registration: '12',
          player: '1',
          tags: 'a',
          url: 'http://example',
          event_id: '4',
        },
        metadata(baseProperties),
        { seedFromQuery: true }
      )
    ).toEqual({ event_id: 4 });
  });

  it('coerces int, bool, and nullable "null"', () => {
    expect(
      seedFormValuesFromQuery(
        {
          event_id: 'not-a-number',
          is_minor: 'false',
          note: 'null',
        },
        metadata(baseProperties),
        { seedFromQuery: true }
      )
    ).toEqual({ is_minor: false, note: null });
  });

  it('does not overwrite a value already typed', () => {
    expect(
      seedFormValuesFromQuery(
        { event_id: '4', player_id: '9' },
        metadata(baseProperties),
        {
          seedFromQuery: true,
          currentValues: { event_id: 99 },
        }
      )
    ).toEqual({ player_id: 9 });
  });
});
