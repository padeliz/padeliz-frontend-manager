import { withSearchParams } from '@/utils/withSearchParams';

describe('withSearchParams', () => {
  it('appends keys to a path without a query', () => {
    expect(withSearchParams('/edition-registrations/add', { edition_id: 4 })).toBe(
      '/edition-registrations/add?edition_id=4'
    );
  });

  it('skips null and undefined', () => {
    expect(
      withSearchParams('/edition-registrations/add', {
        edition_id: 4,
        player_id: null,
        extra: undefined,
      })
    ).toBe('/edition-registrations/add?edition_id=4');
  });

  it('keeps any query already on the path', () => {
    expect(
      withSearchParams('/edition-registrations/add?foo=bar', { edition_id: 4 })
    ).toBe('/edition-registrations/add?foo=bar&edition_id=4');
  });

  it('returns the original href when every value is skipped', () => {
    expect(
      withSearchParams('/edition-registrations/add', {
        edition_id: null,
        player_id: undefined,
      })
    ).toBe('/edition-registrations/add');
  });
});
