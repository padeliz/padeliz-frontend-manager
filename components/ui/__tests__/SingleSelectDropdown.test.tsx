import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';

const OPTIONS = [
  { label: 'Alice', value: 1 },
  { label: 'Bob', value: 2 },
  { label: 'Carol', value: 3 },
];

describe('SingleSelectDropdown', () => {
  it('without searchable: no search input and all options shown', () => {
    const { getByText, queryByTestId } = render(
      <SingleSelectDropdown
        options={OPTIONS}
        selectedValue={null}
        onSelectionChange={() => undefined}
        placeholder="Pick one"
        title="Players"
      />
    );
    fireEvent.press(getByText('Pick one'));
    expect(queryByTestId('dropdown-search')).toBeNull();
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Bob')).toBeTruthy();
    expect(getByText('Carol')).toBeTruthy();
  });

  it('with searchable: filters locally and calls onSearch', () => {
    const onSearch = jest.fn();
    const { getByText, getByTestId, queryByText } = render(
      <SingleSelectDropdown
        options={OPTIONS}
        selectedValue={null}
        onSelectionChange={() => undefined}
        placeholder="Pick one"
        title="Players"
        searchable
        onSearch={onSearch}
      />
    );
    fireEvent.press(getByText('Pick one'));
    const input = getByTestId('dropdown-search');
    expect(input).toBeTruthy();
    fireEvent.changeText(input, 'ali');
    expect(onSearch).toHaveBeenCalledWith('ali');
    expect(getByText('Alice')).toBeTruthy();
    expect(queryByText('Bob')).toBeNull();
    expect(queryByText('Carol')).toBeNull();
  });
});
