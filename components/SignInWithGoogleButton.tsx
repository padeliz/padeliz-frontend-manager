import { API_BASE_URL, GOOGLE_CLIENT_ID } from '@/utils/constants';
import * as Google from 'expo-auth-session/providers/google';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

export default function SignInWithGoogleButton({
  onPress,
  disabled,
}: {
  onPress: (token?: string) => void;
  disabled?: boolean;
}) {
  // Check if Google client ID is properly configured
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.trim() === '') {
    console.error(
      'Google Client ID is not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your .env.local file.'
    );
    return (
      <View className="w-full h-11 bg-red-50 border border-red-200 rounded-lg items-center justify-center">
        <Text className="text-red-600 text-sm font-medium">
          Google Client ID not configured
        </Text>
      </View>
    );
  }

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_CLIENT_ID, // For web platform
    iosClientId: GOOGLE_CLIENT_ID, // For iOS platform
    androidClientId: GOOGLE_CLIENT_ID, // For Android platform
    scopes: ['openid', 'profile', 'email'],
    // Configure for ID token flow
    redirectUri: API_BASE_URL,
    responseType: 'id_token',
  });

  // Handle OAuth response when user returns from Google
  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        onPress(id_token);
      } else {
        console.error('No ID token in response params');
        onPress(); // Call without token to trigger error handling
      }
    } else if (response?.type === 'error') {
      console.error('Google OAuth error:', response.error);
      onPress(); // Call without token to trigger error handling
    } else if (response?.type === 'cancel') {
    } else if (response) {
    }
  }, [response, onPress]);

  // Handle OAuth response from URL parameters (for popup flow)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.hash.substring(1));
      const idToken = urlParams.get('id_token');

      if (idToken) {
        // Check if this is a popup window
        if (window.opener) {
          // Notify the parent window about successful authentication
          window.opener.postMessage(
            {
              type: 'GOOGLE_AUTH_SUCCESS',
              idToken: idToken,
            },
            window.location.origin
          );

          // Close the popup
          window.close();
        } else {
          // This is the main window, proceed with authentication
          onPress(idToken);
        }

        // Clean up the URL
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      }
    }
  }, [onPress]);

  // Listen for messages from popup window (main window only)
  React.useEffect(() => {
    if (typeof window !== 'undefined' && !window.opener) {
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          onPress(event.data.idToken);
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [onPress]);

  const handlePress = async () => {
    try {
      if (disabled) return;
      const result = await promptAsync();

      if (result?.type === 'success') {
        // Get the ID token from the result
        const { id_token } = result.params;
        onPress(id_token);
      } else if (result?.type === 'cancel') {
        console.info('Google sign-in cancelled');
      } else if (result?.type === 'error') {
        console.error('Google sign-in error:', result.error);
        onPress(); // Call without token to trigger error handling
      } else {
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      onPress(); // Call without token to trigger error handling
    }
  };

  return (
    <Pressable onPress={handlePress} disabled={disabled}>
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
