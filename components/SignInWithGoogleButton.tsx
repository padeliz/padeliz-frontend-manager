import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

export default function SignInWithGoogleButton({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled}>
      <View
        style={{
          width: '100%',
          height: 44,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 5,
          backgroundColor: '#fff',
          borderWidth: 1,
          borderColor: '#ccc',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Image
          source={require('../assets/images/google-icon.png')}
          style={{
            width: 18,
            height: 18,
            marginRight: 6,
          }}
        />
        <Text style={{ color: '#000', fontWeight: '600' }}>
          Continue with Google
        </Text>
      </View>
    </Pressable>
  );
}
