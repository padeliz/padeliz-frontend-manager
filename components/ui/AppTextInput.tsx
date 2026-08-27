import { INPUT_PLACEHOLDER_COLOR } from '@/constants/theme';
import React, { forwardRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

const AppTextInput = forwardRef<TextInput, TextInputProps>(function AppTextInput(
  { placeholderTextColor, ...rest },
  ref
) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={placeholderTextColor ?? INPUT_PLACEHOLDER_COLOR}
      {...rest}
    />
  );
});

export default AppTextInput;
