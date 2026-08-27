import { managerNavigationItems } from '@/components/layout/Sidebar';

describe('Sidebar challenges route', () => {
  it('includes Challenges hub href', () => {
    const hrefs = managerNavigationItems.map(item => item.href);
    expect(hrefs).toContain('/challenges');
  });
});
