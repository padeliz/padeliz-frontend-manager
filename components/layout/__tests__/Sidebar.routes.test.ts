import { managerNavigationItems } from '@/components/layout/Sidebar';

describe('Sidebar manager routes match API resource paths', () => {
  it('uses renamed lottery / prize-from-club routes (not legacy paths)', () => {
    const hrefs = managerNavigationItems.map(item => item.href);

    expect(hrefs).toContain('/event-lotteries');
    expect(hrefs).toContain('/event-lottery-luckies');
    expect(hrefs).toContain('/sponsors');
    expect(hrefs).toContain('/sponsor-prizes');
    expect(hrefs).toContain('/event-lottery-prizes');
    expect(hrefs).toContain('/event-participations');
    expect(hrefs).toContain('/event-registrations');
    expect(hrefs).toContain('/clubs');

    expect(hrefs).not.toContain('/prize-from-clubs');
    expect(hrefs).not.toContain('/lotteries');
    expect(hrefs).not.toContain('/event-lucky-ones');
    expect(hrefs).not.toContain('/prizes-from-clubs');
  });
});
