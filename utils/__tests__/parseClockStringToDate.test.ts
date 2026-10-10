import { parseClockStringToDate } from '@/utils/parseClockStringToDate';

describe('parseClockStringToDate', () => {
  it('parses HH:MM:SS and HH:MM with hours 0–23', () => {
    const withSeconds = parseClockStringToDate('10:00:00');
    expect(withSeconds).not.toBeNull();
    expect(withSeconds!.getHours()).toBe(10);
    expect(withSeconds!.getMinutes()).toBe(0);
    expect(withSeconds!.getSeconds()).toBe(0);

    const withoutSeconds = parseClockStringToDate('09:30');
    expect(withoutSeconds).not.toBeNull();
    expect(withoutSeconds!.getHours()).toBe(9);
    expect(withoutSeconds!.getMinutes()).toBe(30);
    expect(withoutSeconds!.getSeconds()).toBe(0);

    const midnight = parseClockStringToDate('00:00:00');
    expect(midnight).not.toBeNull();
    expect(midnight!.getHours()).toBe(0);

    const endOfRange = parseClockStringToDate('23:59:59');
    expect(endOfRange).not.toBeNull();
    expect(endOfRange!.getHours()).toBe(23);
    expect(endOfRange!.getMinutes()).toBe(59);
    expect(endOfRange!.getSeconds()).toBe(59);
  });

  it('rejects empty, invalid, and 24:00 values', () => {
    expect(parseClockStringToDate('')).toBeNull();
    expect(parseClockStringToDate('not-a-time')).toBeNull();
    expect(parseClockStringToDate('24:00:00')).toBeNull();
    expect(parseClockStringToDate('24:00')).toBeNull();
    expect(parseClockStringToDate('25:00:00')).toBeNull();
  });
});
