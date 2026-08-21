import { buildEditionTopTabs, parseEditionDivisionId } from '@/utils/editionWorkspace';

describe('Edition detail routing helpers', () => {
  it('exposes locked tab order without Overview', () => {
    const labels = buildEditionTopTabs(10, null).map(t => t.label);
    expect(labels).toEqual([
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
  });

  it('defaults invalid ed to General', () => {
    expect(parseEditionDivisionId('general', [99])).toBeNull();
    expect(parseEditionDivisionId('99', [99])).toBe(99);
  });
});
