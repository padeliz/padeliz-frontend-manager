import AppTextInput from '@/components/ui/AppTextInput';
import { INPUT_PLACEHOLDER_COLOR } from '@/constants/theme';
import { render } from '@testing-library/react-native';
import React from 'react';
import { TextInput } from 'react-native';

describe('AppTextInput', () => {
  it('defaults placeholderTextColor to theme gray', () => {
    const { UNSAFE_getByType } = render(
      <AppTextInput testID="input" placeholder="Type here" />
    );
    expect(UNSAFE_getByType(TextInput).props.placeholderTextColor).toBe(
      INPUT_PLACEHOLDER_COLOR
    );
  });

  it('allows explicit placeholderTextColor override', () => {
    const { UNSAFE_getByType } = render(
      <AppTextInput
        testID="input"
        placeholder="Type here"
        placeholderTextColor="#ff0000"
      />
    );
    expect(UNSAFE_getByType(TextInput).props.placeholderTextColor).toBe(
      '#ff0000'
    );
  });
});
