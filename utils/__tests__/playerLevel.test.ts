import {
  boundOrNull,
  findBandForLevel,
  formatBandRange,
  isTwoDecimalLevel,
  validatePlayerLevelInput,
} from '@/utils/playerLevel';

// Numerically lower = stronger: level_min (weakest) is the larger number.
const bands = [
  { id_level: 1, name: 'Division 3 Mid', level_min: '3.66', level_max: '3.34' },
  { id_level: 2, name: 'Division 3 Top', level_min: '3.33', level_max: '3.01' },
] as any;

describe('playerLevel utils', () => {
  it('requires exactly two decimals', () => {
    expect(isTwoDecimalLevel('3.50')).toBe(true);
    expect(isTwoDecimalLevel(' 3.50 ')).toBe(true);
    expect(isTwoDecimalLevel('3.5')).toBe(false);
    expect(isTwoDecimalLevel('3.555')).toBe(false);
    expect(isTwoDecimalLevel('3')).toBe(false);
    expect(isTwoDecimalLevel('abc')).toBe(false);
  });

  it('finds the band regardless of min/max orientation', () => {
    expect(findBandForLevel(bands, '3.50')?.id_level).toBe(1);
    expect(findBandForLevel(bands, '3.34')?.id_level).toBe(1);
    expect(findBandForLevel(bands, '3.66')?.id_level).toBe(1);
    expect(findBandForLevel(bands, '3.10')?.id_level).toBe(2);
    expect(findBandForLevel(bands, '5.00')).toBeNull();
    expect(findBandForLevel(bands, 'x')).toBeNull();
  });

  it('validates input against decimals and bands', () => {
    expect(validatePlayerLevelInput('', bands)).toMatch(/Enter a player level/);
    expect(validatePlayerLevelInput('3.5', bands)).toMatch(/2 decimals/);
    expect(validatePlayerLevelInput('5.00', bands)).toMatch(/outside/);
    expect(validatePlayerLevelInput('3.50', bands)).toBeNull();
  });

  it('skips the band check when bands could not be loaded', () => {
    expect(validatePlayerLevelInput('9.99', [])).toBeNull();
    expect(validatePlayerLevelInput('9.9', [])).toMatch(/2 decimals/);
  });

  it('formats a band range and trims bounds', () => {
    expect(formatBandRange(bands[0])).toBe('3.66 → 3.34');
    expect(boundOrNull('  ')).toBeNull();
    expect(boundOrNull(undefined)).toBeNull();
    expect(boundOrNull(' 4.99 ')).toBe('4.99');
  });
});
