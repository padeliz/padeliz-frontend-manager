import React from 'react';
import { Pressable, Text, View } from 'react-native';

export default function StyleTest() {
  return (
    <View className="p-4 bg-blue-500 rounded-lg m-4">
      <Text className="text-white text-lg font-bold text-center mb-2">
        🎨 NativeWind Test
      </Text>
      <Text className="text-blue-100 text-center mb-4">
        If you see this blue box with white text, NativeWind is working!
      </Text>

      <Pressable className="bg-white px-4 py-2 rounded">
        <Text className="text-blue-600 font-semibold text-center">
          Test Button
        </Text>
      </Pressable>
    </View>
  );
}
