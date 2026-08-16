import { ForeignKeyService } from '../foreignKeyService';

describe('ForeignKeyService metadata-driven FK', () => {
  afterEach(() => {
    ForeignKeyService.clearCaches();
  });

  it('isForeignKeyField only when filterable_fields type is foreign_key', () => {
    const metadata: any = {
      filterable_fields: {
        its_first_edition_id: {
          type: 'foreign_key',
          related_schema_name: 'Edition',
          related_schema_field: 'name',
        },
        location_id: { type: 'integer' },
      },
      swagger_schema: { properties: {} },
    };

    expect(
      ForeignKeyService.isForeignKeyField('its_first_edition_id', {}, metadata)
    ).toBe(true);
    expect(
      ForeignKeyService.isForeignKeyField('location_id', { type: 'integer' }, metadata)
    ).toBe(false);
    expect(
      ForeignKeyService.isForeignKeyField('random_id', { type: 'integer' }, metadata)
    ).toBe(false);
  });

  it('getLinkedResourceInfo uses related_schema_name', () => {
    const metadata: any = {
      filterable_fields: {
        its_first_edition_id: {
          type: 'foreign_key',
          related_schema_name: 'Edition',
          related_schema_field: 'name',
        },
      },
      swagger_schema: { properties: {} },
    };
    const info = ForeignKeyService.getLinkedResourceInfo(
      'its_first_edition_id',
      metadata
    );
    expect(info?.resourceName).toBe('Edition');
    expect(info?.displayField).toBe('name');
    expect(typeof info?.fetchOptions).toBe('function');
  });
});
