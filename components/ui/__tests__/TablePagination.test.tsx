import TablePagination from '@/components/ui/TablePagination';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/components/ui/SingleSelectDropdown', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return ({ options }: { options: { label: string }[] }) => (
    <View testID="per-page-dropdown">
      <Text>{options.map(o => o.label).join(',')}</Text>
    </View>
  );
});

const baseProps = {
  currentPage: 2,
  totalPages: 3,
  totalItems: 30,
  perPage: 10,
  onPageChange: jest.fn(),
  onPerPageChange: jest.fn(),
};

describe('TablePagination', () => {
  beforeEach(() => {
    baseProps.onPageChange.mockClear();
  });

  it('full variant shows summary and per-page dropdown', () => {
    const { getByText, getByTestId } = render(
      <TablePagination {...baseProps} />
    );
    expect(getByText(/Showing 11 to 20 of 30/)).toBeTruthy();
    expect(getByTestId('pagination-previous')).toBeTruthy();
    expect(getByTestId('pagination-page')).toBeTruthy();
    expect(getByTestId('pagination-next')).toBeTruthy();
  });

  it('navigation variant uses three-zone layout without summary', () => {
    const { getByTestId, queryByText, getByText } = render(
      <TablePagination {...baseProps} variant="navigation" />
    );
    expect(getByTestId('pagination-previous')).toBeTruthy();
    expect(getByText('Page 2 of 3')).toBeTruthy();
    expect(getByTestId('pagination-next')).toBeTruthy();
    expect(queryByText(/Showing/)).toBeNull();
  });

  it('navigation fires onPageChange from previous and next', () => {
    const { getByTestId } = render(
      <TablePagination {...baseProps} variant="navigation" />
    );
    fireEvent.press(getByTestId('pagination-previous'));
    expect(baseProps.onPageChange).toHaveBeenCalledWith(1);
    fireEvent.press(getByTestId('pagination-next'));
    expect(baseProps.onPageChange).toHaveBeenCalledWith(3);
  });

  it('hideWhenSinglePage returns null when totalPages <= 1', () => {
    const { queryByTestId, rerender } = render(
      <TablePagination
        {...baseProps}
        currentPage={1}
        totalPages={1}
        totalItems={5}
        variant="navigation"
        hideWhenSinglePage
      />
    );
    expect(queryByTestId('pagination-previous')).toBeNull();

    rerender(
      <TablePagination
        {...baseProps}
        currentPage={1}
        totalPages={2}
        totalItems={20}
        variant="navigation"
        hideWhenSinglePage
      />
    );
    expect(queryByTestId('pagination-previous')).toBeTruthy();
  });
});
