import { clockHi } from '@/utils/event/clockHi';

describe('clockHi', () => {
  it('returns em dash for empty', () => {
    expect(clockHi(null)).toBe('—');
    expect(clockHi(undefined)).toBe('—');
    expect(clockHi('')).toBe('—');
  });

  it('extracts HH:MM from H:i:s', () => {
    expect(clockHi('20:00:00')).toBe('20:00');
    expect(clockHi('14:05')).toBe('14:05');
  });

  it('returns non-matching strings as-is', () => {
    expect(clockHi('noon')).toBe('noon');
  });
});
