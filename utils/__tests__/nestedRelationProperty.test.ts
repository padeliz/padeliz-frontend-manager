import { isNestedRelationProperty } from '../nestedRelationProperty';

describe('isNestedRelationProperty', () => {
  it('detects $ref and oneOf $ref', () => {
    expect(
      isNestedRelationProperty({ $ref: '#/components/schemas/Location' })
    ).toBe(true);
    expect(
      isNestedRelationProperty({
        oneOf: [{ $ref: '#/components/schemas/Event' }],
      })
    ).toBe(true);
  });

  it('detects missing type', () => {
    expect(isNestedRelationProperty({ title: 'Weird' })).toBe(true);
  });

  it('allows normal scalars and uploads', () => {
    expect(isNestedRelationProperty({ type: 'integer' })).toBe(false);
    expect(
      isNestedRelationProperty({
        type: 'array',
        'x-padeliz-upload': {
          form_field: 'file',
          upload: { path: '/x', method: 'POST' },
        },
      })
    ).toBe(false);
  });
});
