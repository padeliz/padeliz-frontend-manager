import { buildEditionTopTabs } from '@/utils/editionWorkspace';

describe('edition workspace tabs', () => {
  it('starts with Details then Divisions, Registrations and Participations', () => {
    const tabs = buildEditionTopTabs(1, null);
    expect(tabs[0].label).toBe('Details');
    expect(tabs[1].label).toBe('Divisions');
    expect(tabs[1].href).toContain('/editions/1/divisions');
    expect(tabs[1].match).toBe('/divisions');
    expect(tabs[2].label).toBe('Registrations');
    expect(tabs[2].href).toContain('/editions/1/registrations');
    expect(tabs[2].match).toBe('/registrations');
    expect(tabs[3].label).toBe('Participations');
    expect(tabs[3].href).toContain('/editions/1/participations');
    expect(tabs[3].match).toBe('/participations');
    expect(tabs.some(t => t.label === 'Overview')).toBe(false);
  });
});
