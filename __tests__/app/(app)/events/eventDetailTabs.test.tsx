import { buildEventTopTabs, parseEventDivisionId } from '@/utils/eventWorkspace';

describe('Event detail routing helpers', () => {
  it('exposes locked tab order without Overview', () => {
    const labels = buildEventTopTabs(10, null).map(t => t.label);
    expect(labels).toEqual([
      'Details',
      'Divisions',
      'Registrations',
      'Participations',
      'Referrals',
      'Schedule',
      'Replacements',
      'Lottery',
      'PDFs',
      'Scores',
      'Standings',
    ]);
  });

  it('defaults invalid ed to General', () => {
    expect(parseEventDivisionId('general', [99])).toBeNull();
    expect(parseEventDivisionId('99', [99])).toBe(99);
  });
});
