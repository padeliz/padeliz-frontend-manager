import AppTextInput from '@/components/ui/AppTextInput';
import { SESSION_BOTTOM_TEXT_MAX } from '@/lib/challenges/nameRules';
import React from 'react';
import { Text, View } from 'react-native';

type Props = {
  value: string;
  readOnly: boolean;
  onChangeText: (text: string) => void;
  onSubmitEditing: () => void;
  onBlur: () => void;
  testID: string;
};

export default function ChallengeLiveBottomTextFooter({
  value,
  readOnly,
  onChangeText,
  onSubmitEditing,
  onBlur,
  testID,
}: Props) {
  return (
    <View
      className="bg-gray-50 px-6 py-3"
      testID={`${testID}-wrap`}
    >
      {readOnly ? (
        <Text
          className="text-3xl font-semibold text-center pb-[4px]"
          testID={testID}
        >
          {value}
        </Text>
      ) : (
        <AppTextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing}
          onBlur={onBlur}
          maxLength={SESSION_BOTTOM_TEXT_MAX}
          placeholder="Bottom text"
          className="w-full text-3xl font-semibold text-center px-0 pt-0 pb-[4px] bg-transparent border border-transparent outline-none focus:border-gray-50"
        />
      )}
    </View>
  );
}
