import { buildEventTopTabs } from '@/utils/eventWorkspace';

describe('event workspace tabs', () => {
  it('starts with Details then Divisions, Registrations and Participations', () => {
    const tabs = buildEventTopTabs(1, null);
    expect(tabs[0].label).toBe('Details');
    expect(tabs[1].label).toBe('Divisions');
    expect(tabs[1].href).toContain('/events/1/divisions');
    expect(tabs[1].match).toBe('/divisions');
    expect(tabs[2].label).toBe('Registrations');
    expect(tabs[2].href).toContain('/events/1/registrations');
    expect(tabs[2].match).toBe('/registrations');
    expect(tabs[3].label).toBe('Participations');
    expect(tabs[3].href).toContain('/events/1/participations');
    expect(tabs[3].match).toBe('/participations');
    expect(tabs[4].label).toBe('Referrals');
    expect(tabs[4].href).toContain('/events/1/referrals');
    expect(tabs[4].match).toBe('/referrals');
    expect(tabs.some(t => t.label === 'Overview')).toBe(false);
  });
});
