import React from 'react';
import { render } from '@testing-library/react-native';
import ParticipationFlagBadges from '@/components/editions/ParticipationFlagBadges';

describe('ParticipationFlagBadges', () => {
  it('renders stackable chips for each flag', () => {
    const { getByTestId } = render(
      <ParticipationFlagBadges
        participationId={42}
        flags={['duplicate', 'not_registered']}
      />
    );

    expect(getByTestId('participation-flag-duplicate-42')).toBeTruthy();
    expect(getByTestId('participation-flag-not_registered-42')).toBeTruthy();
  });
});
