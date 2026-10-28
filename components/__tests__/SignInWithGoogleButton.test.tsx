import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import SignInWithGoogleButton from '@/components/SignInWithGoogleButton';

describe('SignInWithGoogleButton', () => {
  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<SignInWithGoogleButton onPress={onPress} />);

    fireEvent.press(screen.getByText('Continue with Google'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(<SignInWithGoogleButton onPress={onPress} disabled />);

    fireEvent.press(screen.getByText('Continue with Google'));

    expect(onPress).not.toHaveBeenCalled();
  });
});
