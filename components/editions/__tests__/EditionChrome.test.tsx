import { buildEditionTopTabs } from '@/utils/editionWorkspace';

describe('edition workspace tabs', () => {
  it('starts with Details and includes Divisions', () => {
    const tabs = buildEditionTopTabs(1, null);
    expect(tabs[0].label).toBe('Details');
    expect(tabs.some(t => t.label === 'Divisions')).toBe(true);
    expect(tabs.some(t => t.label === 'Overview')).toBe(false);
  });
});
