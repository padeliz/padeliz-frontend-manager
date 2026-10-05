import {
  findActiveEventTabLabel,
  isEventTabActive,
} from '@/utils/eventTabMatch';
import type { EventTabLink } from '@/components/events/EventTabsBar';

describe('eventTabMatch', () => {
  const lotteryTabs: EventTabLink[] = [
    {
      label: 'Prizes',
      href: '/events/1/lottery/prizes',
      match: 'prizes',
    },
    {
      label: 'Rules',
      href: '/events/1/lottery/rules',
      match: 'rules',
    },
  ];

  it('matches single-segment nested lottery tabs', () => {
    expect(
      isEventTabActive('/events/1/lottery/prizes', 'prizes')
    ).toBe(true);
    expect(
      isEventTabActive('/events/1/lottery/prizes', 'rules')
    ).toBe(false);
  });

  it('finds active nested lottery tab label', () => {
    expect(
      findActiveEventTabLabel('/events/1/lottery/prizes', lotteryTabs)
    ).toBe('Prizes');
  });

  it('supports matchExact for list-style tabs', () => {
    expect(
      isEventTabActive('/events/1/registrations', '/registrations', true)
    ).toBe(true);
    expect(
      isEventTabActive(
        '/events/1/registrations/register-players',
        '/registrations',
        true
      )
    ).toBe(false);
  });
});
