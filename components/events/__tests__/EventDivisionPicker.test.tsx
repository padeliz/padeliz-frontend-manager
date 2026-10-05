import EventDivisionPicker from '@/components/events/EventDivisionPicker';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

describe('EventDivisionPicker', () => {
  const divisions = [
    {
      id_event_division: 12,
      event_id: 1,
      division_id: 2,
      division_title: 'Open A',
      players_limit: 16,
      playing_start_time: '09:00',
      playing_end_time: '18:00',
      player_matches_repeat: 1,
      include_scores: true,
      has_demonstrative_match: false,
      inserted_at: 1,
    },
  ] as any;

  it('shows division title for numeric selected value without chrome label', () => {
    const { getByText, queryByText, getByTestId } = render(
      <EventDivisionPicker
        divisions={divisions}
        value={12}
        onChange={() => {}}
        includeGeneral
      />
    );
    expect(getByText('Open A')).toBeTruthy();
    expect(getByTestId('event-division-picker')).toBeTruthy();
    expect(queryByText('Event division')).toBeNull();
  });

  it('keeps Event division as modal title when sheet opens', () => {
    const { getByText } = render(
      <EventDivisionPicker
        divisions={divisions}
        value={12}
        onChange={() => {}}
        includeGeneral
      />
    );
    fireEvent.press(getByText('Open A'));
    expect(getByText('Event division')).toBeTruthy();
  });

  it('coerces string-like ids via Number for label match', () => {
    render(
      <EventDivisionPicker
        divisions={divisions}
        value={Number('12')}
        onChange={() => {}}
        includeGeneral
      />
    );
    expect(screen.getByText('Open A')).toBeTruthy();
  });
});
