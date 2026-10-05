/**
 * @jest-environment jsdom
 */
import { managerNavigationItems } from '@/components/layout/Sidebar';

describe('Sidebar benefits nav', () => {
  it('includes benefits and entitlements catalog links', () => {
    const hrefs = managerNavigationItems.map(i => i.href);
    expect(hrefs).toContain('/benefits');
    expect(hrefs).toContain('/benefit-entitlements');
  });
});
