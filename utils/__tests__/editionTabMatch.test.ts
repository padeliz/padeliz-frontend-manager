import {
  findActiveEditionTabLabel,
  isEditionTabActive,
} from '@/utils/editionTabMatch';
import type { EditionTabLink } from '@/components/editions/EditionTabsBar';

describe('editionTabMatch', () => {
  const lotteryTabs: EditionTabLink[] = [
    {
      label: 'Prizes',
      href: '/editions/1/lottery/prizes',
      match: 'prizes',
    },
    {
      label: 'Rules',
      href: '/editions/1/lottery/rules',
      match: 'rules',
    },
  ];

  it('matches single-segment nested lottery tabs', () => {
    expect(
      isEditionTabActive('/editions/1/lottery/prizes', 'prizes')
    ).toBe(true);
    expect(
      isEditionTabActive('/editions/1/lottery/prizes', 'rules')
    ).toBe(false);
  });

  it('finds active nested lottery tab label', () => {
    expect(
      findActiveEditionTabLabel('/editions/1/lottery/prizes', lotteryTabs)
    ).toBe('Prizes');
  });

  it('supports matchExact for list-style tabs', () => {
    expect(
      isEditionTabActive('/editions/1/registrations', '/registrations', true)
    ).toBe(true);
    expect(
      isEditionTabActive(
        '/editions/1/registrations/register-players',
        '/registrations',
        true
      )
    ).toBe(false);
  });
});
