import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

const OPTIONS = [
  { label: 'Alice', value: 1 },
  { label: 'Bob', value: 2 },
  { label: 'Carol', value: 3 },
  { label: 'Ștefan', value: 4 },
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
    expect(queryByTestId('dropdown-search-wrapper')).toBeNull();
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Bob')).toBeTruthy();
    expect(getByText('Carol')).toBeTruthy();
  });

  it('with searchable and onSearch: keeps all options visible locally', () => {
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
    const wrapper = getByTestId('dropdown-search-wrapper');
    const input = wrapper.findByType(require('react-native').TextInput);
    fireEvent.changeText(input, 'ali');
    expect(onSearch).toHaveBeenCalledWith('ali');
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Bob')).toBeTruthy();
    expect(getByText('Carol')).toBeTruthy();
  });

  it('with searchable and no onSearch: filters locally with diacritic folding', () => {
    const { getByText, getByTestId, queryByText } = render(
      <SingleSelectDropdown
        options={OPTIONS}
        selectedValue={null}
        onSelectionChange={() => undefined}
        placeholder="Pick one"
        title="Players"
        searchable
      />
    );
    fireEvent.press(getByText('Pick one'));
    const wrapper = getByTestId('dropdown-search-wrapper');
    const input = wrapper.findByType(require('react-native').TextInput);
    fireEvent.changeText(input, 'stefan');
    expect(getByText('Ștefan')).toBeTruthy();
    expect(queryByText('Alice')).toBeNull();
  });

  it('clearable defaults false and does not render dropdown-clear', () => {
    const { getByText, queryByTestId } = render(
      <SingleSelectDropdown
        options={OPTIONS}
        selectedValue={1}
        onSelectionChange={() => undefined}
        placeholder="Pick one"
        title="Players"
      />
    );
    expect(getByText('Alice')).toBeTruthy();
    expect(queryByTestId('dropdown-clear')).toBeNull();
  });

  it('clearable true calls onSelectionChange(null) without selecting an option', () => {
    const onSelectionChange = jest.fn();
    const { getByTestId, queryByText } = render(
      <SingleSelectDropdown
        options={OPTIONS}
        selectedValue={1}
        onSelectionChange={onSelectionChange}
        placeholder="Pick one"
        title="Players"
        clearable
      />
    );
    fireEvent.press(getByTestId('dropdown-clear'));
    expect(onSelectionChange).toHaveBeenCalledWith(null);
    expect(queryByText('None')).toBeNull();
  });

  it('renders imageUrl on the selected option', () => {
    const { getByTestId } = render(
      <SingleSelectDropdown
        options={[{ label: 'Mara', value: 1, imageUrl: 'https://img.test/a.png' }]}
        selectedValue={1}
        onSelectionChange={() => undefined}
        placeholder="Pick one"
        title="Players"
      />
    );
    expect(getByTestId('dropdown-trigger-image')).toBeTruthy();
  });

  it('notifies onOpenChange when opening and closing', () => {
    const onOpenChange = jest.fn();
    const onSelectionChange = jest.fn();
    const { getByText } = render(
      <SingleSelectDropdown
        options={OPTIONS}
        selectedValue={null}
        onSelectionChange={onSelectionChange}
        placeholder="Pick one"
        title="Players"
        onOpenChange={onOpenChange}
      />
    );
    fireEvent.press(getByText('Pick one'));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    fireEvent.press(getByText('Alice'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders footer and keeps selection behavior', () => {
    const onSelectionChange = jest.fn();
    const { getByText, getByTestId } = render(
      <SingleSelectDropdown
        options={OPTIONS}
        selectedValue={null}
        onSelectionChange={onSelectionChange}
        placeholder="Pick one"
        title="Players"
        footer={<Text testID="dropdown-footer">View all</Text>}
      />
    );
    fireEvent.press(getByText('Pick one'));
    expect(getByTestId('dropdown-footer')).toHaveTextContent('View all');
    fireEvent.press(getByText('Bob'));
    expect(onSelectionChange).toHaveBeenCalledWith(2);
  });
});
