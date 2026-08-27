import HeaderActionButton from '@/components/ui/HeaderActionButton';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

describe('HeaderActionButton', () => {
  it('forwards accessibilityLabel to Pressable, defaulting to label', () => {
    const { getByTestId, rerender } = render(
      <HeaderActionButton label="↩️" onPress={() => undefined} testID="undo" />
    );
    expect(getByTestId('undo').props.accessibilityLabel).toBe('↩️');

    rerender(
      <HeaderActionButton
        label="↩️"
        accessibilityLabel="Undo"
        onPress={() => undefined}
        testID="undo"
      />
    );
    expect(getByTestId('undo').props.accessibilityLabel).toBe('Undo');
  });

  it('shows Saving… while loading instead of emoji label', () => {
    const { getByText, queryByText } = render(
      <HeaderActionButton label="✔️" loading onPress={() => undefined} />
    );
    expect(getByText('Saving…')).toBeTruthy();
    expect(queryByText('✔️')).toBeNull();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <HeaderActionButton
        label="Complete"
        onPress={onPress}
        testID="complete"
      />
    );
    fireEvent.press(getByTestId('complete'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('iconOnly renders borderless icon with iconColor', () => {
    const { getByTestId, queryByText } = render(
      <HeaderActionButton
        label="Undo"
        icon="arrow-undo-outline"
        iconOnly
        iconColor="#6b7280"
        accessibilityLabel="Undo"
        onPress={() => undefined}
        testID="undo-icon"
      />
    );
    const btn = getByTestId('undo-icon');
    expect(btn.props.accessibilityLabel).toBe('Undo');
    expect(btn.props.className).toBe('p-1');
    expect(btn.props.className).not.toMatch(/rounded-lg/);
    expect(queryByText('Undo')).toBeNull();
  });

  it('refresh label+icon keeps pill styling', () => {
    const { getByText, getByTestId } = render(
      <HeaderActionButton
        label="Refresh"
        icon="refresh"
        onPress={() => undefined}
        testID="refresh"
      />
    );
    expect(getByText('Refresh')).toBeTruthy();
    expect(getByTestId('refresh').props.className).toMatch(/rounded-lg/);
  });
});
