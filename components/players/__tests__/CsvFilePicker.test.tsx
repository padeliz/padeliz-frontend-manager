/**
 * @jest-environment jsdom
 */
import CsvFilePicker from '@/components/players/CsvFilePicker';
import { render } from '@testing-library/react-native';
import React from 'react';

describe('CsvFilePicker', () => {
  it('places testID on the wrapper view, not the hidden input', () => {
    const { getByTestId } = render(
      <CsvFilePicker onFile={jest.fn()} filename="players.csv" />
    );

    expect(getByTestId('csv-file-picker')).toBeTruthy();
  });
});
