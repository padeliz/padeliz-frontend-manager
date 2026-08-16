import { generateColumnsFromMetadata } from '../tableColumns';

describe('generateColumnsFromMetadata follow-ups', () => {
  it('pins display_field after PK and excludes configured fields via caller', () => {
    const metadata: any = {
      schema_name: 'Player',
      resource_path: 'players',
      display_field: 'name',
      swagger_schema: {
        required: ['first_name'],
        properties: {
          id_player: { type: 'integer', format: 'int64', readOnly: true },
          first_name: { type: 'string' },
          name: { type: 'string', readOnly: true },
          year_of_birth: { type: 'integer', format: 'year' },
        },
      },
      searchable_fields: ['name'],
      filterable_fields: {},
      sortable_fields: ['id_player', 'name', 'year_of_birth'],
    };

    const cols = generateColumnsFromMetadata(metadata, {
      excludeFields: ['first_name'],
    });
    expect(cols.map(c => c.key)).toEqual([
      'id_player',
      'name',
      'year_of_birth',
    ]);
  });

  it('uses resource_path for parent view link fallback', () => {
    const metadata: any = {
      schema_name: 'Location',
      resource_path: 'locations',
      display_field: 'name',
      swagger_schema: {
        required: [],
        properties: {
          id_location: { type: 'integer', format: 'int64', readOnly: true },
          name: { type: 'string' },
        },
      },
      searchable_fields: [],
      filterable_fields: {},
      sortable_fields: [],
    };
    const cols = generateColumnsFromMetadata(metadata, {});
    const nameCol = cols.find(c => c.key === 'name');
    expect(nameCol?.render).toBeDefined();
  });
});
