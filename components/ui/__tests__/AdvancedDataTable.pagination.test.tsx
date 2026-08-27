import AdvancedDataTable from '@/components/ui/AdvancedDataTable';
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/components/ui/SingleSelectDropdown', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return ({ options }: { options: { label: string }[] }) => (
    <View testID="adt-per-page">
      <Text>{options.map(o => o.label).join(',')}</Text>
    </View>
  );
});

describe('AdvancedDataTable pagination sizes', () => {
  it('keeps page sizes [10, 25, 50, 100] after TablePagination extract', () => {
    const { getByText } = render(
      <AdvancedDataTable
        data={[]}
        columns={[{ key: 'id', label: 'ID', render: () => null }]}
        loading={false}
        pagination={{
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          perPage: 10,
          onPageChange: () => undefined,
          onPerPageChange: () => undefined,
        }}
      />
    );
    expect(getByText('10,25,50,100')).toBeTruthy();
  });
});
