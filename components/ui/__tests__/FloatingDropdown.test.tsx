import FloatingDropdown from '@/components/ui/FloatingDropdown';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';

describe('FloatingDropdown', () => {
  it('does not mount footer wrapper for empty-string footer', () => {
    const { queryByTestId, getByText } = render(
      <FloatingDropdown
        trigger={<Text>Open</Text>}
        isOpen
        onOpen={() => undefined}
        onClose={() => undefined}
        title="Pick"
        footer=""
      >
        <Text>Body</Text>
      </FloatingDropdown>
    );
    expect(getByText('Body')).toBeTruthy();
    expect(queryByTestId('floating-dropdown-footer')).toBeNull();
  });

  it('does not mount footer wrapper when footer is omitted', () => {
    const { queryByTestId } = render(
      <FloatingDropdown
        trigger={<Text>Open</Text>}
        isOpen
        onOpen={() => undefined}
        onClose={() => undefined}
        title="Pick"
      >
        <Text>Body</Text>
      </FloatingDropdown>
    );
    expect(queryByTestId('floating-dropdown-footer')).toBeNull();
  });

  it('renders a real footer node', () => {
    const { getByTestId } = render(
      <FloatingDropdown
        trigger={<Text>Open</Text>}
        isOpen
        onOpen={() => undefined}
        onClose={() => undefined}
        title="Pick"
        footer={<Text testID="fd-footer">X</Text>}
      >
        <View>
          <Text>Body</Text>
        </View>
      </FloatingDropdown>
    );
    expect(getByTestId('floating-dropdown-footer')).toBeTruthy();
    expect(getByTestId('fd-footer')).toHaveTextContent('X');
  });

  it('opens from trigger when not disabled', () => {
    const onOpen = jest.fn();
    const { getByText } = render(
      <FloatingDropdown
        trigger={<Text>Open</Text>}
        isOpen={false}
        onOpen={onOpen}
        onClose={() => undefined}
        title="Pick"
      >
        <Text>Body</Text>
      </FloatingDropdown>
    );
    fireEvent.press(getByText('Open'));
    expect(onOpen).toHaveBeenCalled();
  });
});
