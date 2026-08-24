import {
  formatResourceHeaderTitle,
  getResourceDisplayLabel,
} from '@/utils/getResourceDisplayLabel';

describe('formatResourceHeaderTitle', () => {
  it('prefixes resource name and label', () => {
    expect(formatResourceHeaderTitle('Club', 'Ace')).toBe('Club: Ace');
  });

  it('returns resource name when label is empty', () => {
    expect(formatResourceHeaderTitle('Club', '')).toBe('Club');
    expect(formatResourceHeaderTitle('Club', '   ')).toBe('Club');
  });
});

describe('getResourceDisplayLabel', () => {
  it('uses metadata display_field when present', () => {
    expect(
      getResourceDisplayLabel(
        {
          display_field: 'name',
          swagger_schema: { properties: {} },
        } as any,
        { name: 'Ace' }
      )
    ).toBe('Ace');
  });
});
