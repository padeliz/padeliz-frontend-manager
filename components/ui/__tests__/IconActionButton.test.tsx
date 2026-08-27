import IconActionButton from '@/components/ui/IconActionButton';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

describe('IconActionButton', () => {
  it('forwards accessibilityLabel, testID, and onPress', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <IconActionButton
        icon="add-circle-outline"
        color="#111827"
        accessibilityLabel="Requeue"
        testID="requeue-btn"
        onPress={onPress}
      />
    );
    const btn = getByTestId('requeue-btn');
    expect(btn.props.accessibilityLabel).toBe('Requeue');
    fireEvent.press(btn);
    expect(onPress).toHaveBeenCalled();
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <IconActionButton
        icon="trash-outline"
        color="#ea580c"
        accessibilityLabel="Remove"
        testID="remove-btn"
        disabled
        onPress={onPress}
      />
    );
    fireEvent.press(getByTestId('remove-btn'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
