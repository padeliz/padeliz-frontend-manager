import ResourceSubHeader from '@/components/pages/ResourceSubHeader';
import { render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

describe('ResourceSubHeader', () => {
  it('renders title, description, and actions', () => {
    const { getByTestId, getByText } = render(
      <ResourceSubHeader
        title="Section"
        description="Details"
        actions={<Text testID="sub-action">Go</Text>}
      />
    );
    expect(getByTestId('resource-sub-header')).toBeTruthy();
    expect(getByText('Section')).toBeTruthy();
    expect(getByText('Details')).toBeTruthy();
    expect(getByTestId('sub-action')).toBeTruthy();
  });

  it('returns null when empty', () => {
    const { queryByTestId } = render(<ResourceSubHeader />);
    expect(queryByTestId('resource-sub-header')).toBeNull();
  });
});
