import {
  buildEditionTopTabs,
  parseEditionDivisionId,
  parseEditionDivisionIdOptimistic,
  parseLotteryId,
  withEdQuery,
  withLotteryQuery,
} from '@/utils/editionWorkspace';

describe('editionWorkspace', () => {
  it('treats missing or invalid ed as General', () => {
    expect(parseEditionDivisionId(undefined, [1, 2])).toBeNull();
    expect(parseEditionDivisionId('general', [1, 2])).toBeNull();
    expect(parseEditionDivisionId('99', [1, 2])).toBeNull();
    expect(parseEditionDivisionId('2', [1, 2])).toBe(2);
  });

  it('accepts string ids in validIds via Number normalize', () => {
    expect(parseEditionDivisionId('12', ['12' as any, '13' as any])).toBe(12);
    expect(parseEditionDivisionId('12', [12, 13])).toBe(12);
  });

  it('keeps numeric ed while divisions are still loading', () => {
    expect(parseEditionDivisionIdOptimistic('7', [], false)).toBe(7);
    expect(parseEditionDivisionIdOptimistic('7', [1, 2], true)).toBeNull();
    expect(parseEditionDivisionIdOptimistic('7', [7], true)).toBe(7);
  });

  it('appends ed query only when set', () => {
    expect(withEdQuery('/editions/1/scores', null)).toBe('/editions/1/scores');
    expect(withEdQuery('/editions/1/scores', 5)).toBe(
      '/editions/1/scores?ed=5'
    );
  });

  it('builds top tabs including Details with ed preserved', () => {
    const tabs = buildEditionTopTabs(42, 7);
    expect(tabs.map(t => t.label)).toEqual([
      'Details',
      'Divisions',
      'Registrations',
      'Participations',
      'Schedule',
      'Replacements',
      'Lottery',
      'PDFs',
      'Scores',
      'Standings',
    ]);
    expect(tabs.find(t => t.label === 'Scores')?.href).toContain('ed=7');
    expect(tabs.find(t => t.label === 'Details')?.href).toContain('ed=7');
    expect(tabs.find(t => t.label === 'Registrations')?.href).toContain(
      '/editions/42/registrations'
    );
    expect(tabs.find(t => t.label === 'Participations')?.href).toContain(
      '/editions/42/participations'
    );
    expect(tabs.find(t => t.label === 'Registrations')?.match).toBe(
      '/registrations'
    );
    expect(tabs.find(t => t.label === 'Participations')?.match).toBe(
      '/participations'
    );
    expect(tabs.find(t => t.label === 'Divisions')?.href).toContain(
      '/editions/42/divisions'
    );
    expect(tabs.find(t => t.label === 'Divisions')?.match).toBe('/divisions');
  });

  it('documents ED navigate replace URLs (select vs General clear)', () => {
    const pathname = '/editions/36/scores';
    expect(withEdQuery(pathname, 170)).toBe('/editions/36/scores?ed=170');
    // General: replace(pathname) — withEdQuery(null) must NOT be used to clear
    expect(withEdQuery(pathname, null)).toBe(pathname);
  });

  it('parses lottery query without auto-picking', () => {
    expect(parseLotteryId(undefined, [1, 2])).toBeNull();
    expect(parseLotteryId('99', [1, 2])).toBeNull();
    expect(parseLotteryId('2', [1, 2])).toBe(2);
    expect(parseLotteryId('2')).toBe(2);
  });

  it('composes lottery query with ed', () => {
    expect(withLotteryQuery('/editions/1/lottery/prizes', null)).toBe(
      '/editions/1/lottery/prizes'
    );
    expect(withLotteryQuery('/editions/1/lottery/prizes', 3)).toBe(
      '/editions/1/lottery/prizes?lottery=3'
    );
    expect(
      withLotteryQuery(withEdQuery('/editions/1/lottery/rules', 9), 3)
    ).toBe('/editions/1/lottery/rules?ed=9&lottery=3');
  });

  it('deletes lottery from href when id is null', () => {
    expect(
      withLotteryQuery('/editions/1/lottery/prizes?lottery=99', null)
    ).toBe('/editions/1/lottery/prizes');
    expect(
      withLotteryQuery('/editions/1/lottery/prizes?ed=9&lottery=99', null)
    ).toBe('/editions/1/lottery/prizes?ed=9');
  });

  it('preserves lottery on top lottery tab href', () => {
    const tabs = buildEditionTopTabs(42, 7, 3);
    expect(tabs.find(t => t.label === 'Lottery')?.href).toContain('lottery=3');
    expect(tabs.find(t => t.label === 'Lottery')?.href).toContain('ed=7');
  });
});
