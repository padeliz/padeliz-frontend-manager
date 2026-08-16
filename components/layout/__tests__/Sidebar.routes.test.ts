import { managerNavigationItems } from '@/components/layout/Sidebar';

describe('Sidebar manager routes match API resource paths', () => {
  it('uses renamed lottery / prize-from-club routes (not legacy paths)', () => {
    const hrefs = managerNavigationItems.map(item => item.href);

    expect(hrefs).toContain('/edition-lotteries');
    expect(hrefs).toContain('/edition-lottery-luckies');
    expect(hrefs).toContain('/prize-from-clubs');
    expect(hrefs).toContain('/edition-lottery-rules');

    expect(hrefs).not.toContain('/lotteries');
    expect(hrefs).not.toContain('/edition-lucky-ones');
    expect(hrefs).not.toContain('/prizes-from-clubs');
  });
});
