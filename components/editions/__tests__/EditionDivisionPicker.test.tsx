import EditionDivisionPicker from '@/components/editions/EditionDivisionPicker';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

describe('EditionDivisionPicker', () => {
  const divisions = [
    {
      id_edition_division: 12,
      edition_id: 1,
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
      <EditionDivisionPicker
        divisions={divisions}
        value={12}
        onChange={() => {}}
        includeGeneral
      />
    );
    expect(getByText('Open A')).toBeTruthy();
    expect(getByTestId('edition-division-picker')).toBeTruthy();
    expect(queryByText('Edition division')).toBeNull();
  });

  it('keeps Edition division as modal title when sheet opens', () => {
    const { getByText } = render(
      <EditionDivisionPicker
        divisions={divisions}
        value={12}
        onChange={() => {}}
        includeGeneral
      />
    );
    fireEvent.press(getByText('Open A'));
    expect(getByText('Edition division')).toBeTruthy();
  });

  it('coerces string-like ids via Number for label match', () => {
    render(
      <EditionDivisionPicker
        divisions={divisions}
        value={Number('12')}
        onChange={() => {}}
        includeGeneral
      />
    );
    expect(screen.getByText('Open A')).toBeTruthy();
  });
});
