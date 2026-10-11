import {
  bucharestDatetimeLocalToUnix,
  classifyTiming,
  productDateTimeToDate,
  unixToBucharestDatetimeLocal,
} from '@/utils/productDateTime';

describe('productDateTime', () => {
  it('converts Bucharest wall time without UTC skew (winter UTC+2)', () => {
    expect(
      productDateTimeToDate('2026-01-20', '18:00:00').toISOString()
    ).toBe('2026-01-20T16:00:00.000Z');
  });

  it('round-trips datetime-local through unix', () => {
    const unix = Math.floor(
      productDateTimeToDate('2026-08-24', '10:00:00').getTime() / 1000
    );
    expect(unixToBucharestDatetimeLocal(unix)).toBe('2026-08-24T10:00');
    expect(bucharestDatetimeLocalToUnix('2026-08-24T10:00')).toBe(unix);
  });

  it('classifies calendar timing in Bucharest', () => {
    const now = new Date('2026-08-24T12:00:00Z');
    const starts = Math.floor(
      productDateTimeToDate('2026-08-24', '09:00:00').getTime() / 1000
    );
    const ends = Math.floor(
      productDateTimeToDate('2026-08-24', '22:00:00').getTime() / 1000
    );
    expect(classifyTiming(starts, ends, now)).toBe('ongoing');
  });
});
