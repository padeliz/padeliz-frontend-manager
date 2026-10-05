import { withSearchParams } from '@/utils/withSearchParams';

describe('withSearchParams', () => {
  it('appends keys to a path without a query', () => {
    expect(withSearchParams('/event-registrations/add', { event_id: 4 })).toBe(
      '/event-registrations/add?event_id=4'
    );
  });

  it('skips null and undefined', () => {
    expect(
      withSearchParams('/event-registrations/add', {
        event_id: 4,
        player_id: null,
        extra: undefined,
      })
    ).toBe('/event-registrations/add?event_id=4');
  });

  it('keeps any query already on the path', () => {
    expect(
      withSearchParams('/event-registrations/add?foo=bar', { event_id: 4 })
    ).toBe('/event-registrations/add?foo=bar&event_id=4');
  });

  it('returns the original href when every value is skipped', () => {
    expect(
      withSearchParams('/event-registrations/add', {
        event_id: null,
        player_id: undefined,
      })
    ).toBe('/event-registrations/add');
  });
});
