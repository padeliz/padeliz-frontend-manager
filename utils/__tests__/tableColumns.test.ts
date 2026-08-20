import { generateColumnsFromMetadata } from '@/utils/tableColumns';

describe('tableColumns', () => {
  const baseMetadata: any = {
    display_field: 'name',
    swagger_schema: {
      properties: {
        id_player: {
          type: 'integer',
          format: 'int64',
          readOnly: true,
          title: 'ID',
        },
        name: {
          type: 'string',
          readOnly: true,
          title: 'Name',
        },
        first_name: {
          type: 'string',
          title: 'First name',
        },
      },
    },
    filterable_fields: {},
    sortable_fields: ['name', 'first_name'],
    searchable_fields: ['name'],
  };

  it('keeps readOnly display_field column for view links', () => {
    const onView = jest.fn();
    const columns = generateColumnsFromMetadata(baseMetadata, { onView });
    const nameCol = columns.find((c: any) => c.key === 'name');
    expect(nameCol).toBeTruthy();
    expect(typeof nameCol.render).toBe('function');
  });

  it('attaches view link to PK when display_field is null', () => {
    const onView = jest.fn();
    const metadata = {
      ...baseMetadata,
      display_field: null,
    };
    const columns = generateColumnsFromMetadata(metadata, { onView });
    const pkCol = columns.find((c: any) => c.key === 'id_player');
    expect(pkCol).toBeTruthy();
    expect(typeof pkCol.render).toBe('function');
  });

  it('returns empty columns when swagger_schema is null', () => {
    const metadata = {
      ...baseMetadata,
      swagger_schema: null,
    };
    expect(generateColumnsFromMetadata(metadata as any)).toEqual([]);
  });

  it('returns empty columns when swagger_schema has no properties', () => {
    const metadata = {
      ...baseMetadata,
      swagger_schema: {},
    };
    expect(generateColumnsFromMetadata(metadata as any)).toEqual([]);
  });
});
