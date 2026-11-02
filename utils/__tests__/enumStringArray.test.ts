import { isEnumStringArray } from '../enumStringArray';

describe('isEnumStringArray', () => {
  it('is true for purposes-shaped string enum arrays', () => {
    expect(
      isEnumStringArray({
        type: 'array',
        items: { type: 'string', enum: ['contact', 'login'] },
      })
    ).toBe(true);
  });

  it('is false for relation $ref arrays', () => {
    expect(
      isEnumStringArray({
        type: 'array',
        items: { $ref: '#/components/schemas/EventParticipation' },
      })
    ).toBe(false);
  });

  it('is false for plain arrays without enum', () => {
    expect(
      isEnumStringArray({
        type: 'array',
        items: { type: 'string' },
      })
    ).toBe(false);
  });

  it('is false for non-arrays', () => {
    expect(isEnumStringArray({ type: 'string', enum: ['a'] })).toBe(false);
    expect(isEnumStringArray(null)).toBe(false);
  });
});
