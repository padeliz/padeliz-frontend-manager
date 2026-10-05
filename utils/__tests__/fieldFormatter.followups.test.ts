import { formatField } from '../fieldFormatter';

const baseMeta = (props: Record<string, any>, filterable: Record<string, any> = {}) =>
  ({
    version: 'v1',
    schema_name: 'Division',
    resource_path: 'divisions',
    swagger_schema: { required: [], properties: props },
    request_body: {},
    searchable_fields: [],
    filterable_fields: filterable,
    sortable_fields: [],
  }) as any;

describe('formatField color/year/FK/nests', () => {
  it('sets foreign_key_selector from filterable_fields', () => {
    const metadata = baseMeta(
      { its_first_event_id: { type: 'integer', format: 'int64' } },
      {
        its_first_event_id: {
          type: 'foreign_key',
          related_schema_name: 'Event',
          related_schema_field: 'name',
        },
      }
    );
    const result = formatField({
      metadata,
      fieldKey: 'its_first_event_id',
      fieldValue: 3,
      mode: 'form',
    });
    expect(result.inputType).toBe('foreign_key_selector');
    expect(result.isForeignKey).toBe(true);
  });

  it('handles format color and year without throwing', () => {
    const colorMeta = baseMeta({
      color: { type: 'string', format: 'color', pattern: '^#[0-9A-Fa-f]{6}$' },
    });
    const color = formatField({
      metadata: colorMeta,
      fieldKey: 'color',
      fieldValue: '#aabbcc',
      mode: 'form',
    });
    expect(color.inputType).toBe('color');
    expect(color.apiValue).toBe('#AABBCC');

    const yearMeta = baseMeta({
      year_of_birth: { type: 'integer', format: 'year', minimum: 1900, maximum: 9999 },
    });
    const year = formatField({
      metadata: yearMeta,
      fieldKey: 'year_of_birth',
      fieldValue: 1990,
      mode: 'form',
    });
    expect(year.inputType).toBe('year');
    expect(year.apiValue).toBe(1990);
  });

  it('does not throw on typeless nest', () => {
    const metadata = baseMeta({
      location: { oneOf: [{ $ref: '#/components/schemas/Location' }] },
    });
    const result = formatField({
      metadata,
      fieldKey: 'location',
      fieldValue: { id_location: 1 },
      mode: 'form',
    });
    expect(result.inputType).toBe('readonly');
    expect(result.isEditable).toBe(false);
  });

  it('uses nested BelongsTo object for FK display label and keeps id as apiValue in form', () => {
    const metadata = baseMeta(
      {
        its_first_event_id: { type: 'integer', format: 'int64' },
        itsFirstEvent: {
          oneOf: [{ $ref: '#/components/schemas/Event' }],
        },
      },
      {
        its_first_event_id: {
          type: 'foreign_key',
          related_schema_name: 'Event',
          related_schema_field: 'name',
        },
      }
    );
    const display = formatField({
      metadata,
      fieldKey: 'its_first_event_id',
      fieldValue: 3,
      mode: 'display',
      record: { its_first_event_id: 3, itsFirstEvent: { name: 'Spring 2026' } },
    });
    expect(display.formattedText).toBe('Spring 2026');

    const form = formatField({
      metadata,
      fieldKey: 'its_first_event_id',
      fieldValue: 3,
      mode: 'form',
      record: { its_first_event_id: 3, itsFirstEvent: { name: 'Spring 2026' } },
    });
    expect(form.inputType).toBe('foreign_key_selector');
    expect(form.apiValue).toBe(3);
  });

  it('falls back to raw id when nest is missing', () => {
    const metadata = baseMeta(
      {
        its_first_event_id: { type: 'integer', format: 'int64' },
        itsFirstEvent: {
          oneOf: [{ $ref: '#/components/schemas/Event' }],
        },
      },
      {
        its_first_event_id: {
          type: 'foreign_key',
          related_schema_name: 'Event',
          related_schema_field: 'name',
        },
      }
    );
    const result = formatField({
      metadata,
      fieldKey: 'its_first_event_id',
      fieldValue: 9,
      mode: 'display',
      record: { its_first_event_id: 9 },
    });
    expect(result.formattedText).toBe('9');
  });
});
