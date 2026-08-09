import { BASE_URL, GOOGLE_CLIENT_ID } from '@/utils/constants';
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
    // For popup flows, use a dedicated callback route
    redirectUri: `${BASE_URL}/auth/callback`,
    responseType: 'id_token',
    // Ensure proper popup behavior
    usePKCE: false,
  });

  // OAuth URL is available when request is ready

  // Handle OAuth response when user returns from Google
  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        onPress(id_token);
      } else {
        console.error(
          '❌ SignInWithGoogleButton: No ID token in response params'
        );
        // Call with empty string to indicate error
        onPress('');
      }
    } else if (response?.type === 'error') {
      console.error(
        '❌ SignInWithGoogleButton: OAuth error response:',
        response.error
      );
      // Call with empty string to indicate error
      onPress('');
    } else if (response?.type === 'cancel') {
      // User cancelled the OAuth flow
    } else if (response) {
      // Handle other response types if needed
    }
  }, [response, onPress]);

  // Handle OAuth response from URL parameters (for popup flow)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if we're on the callback route
      if (window.location.pathname === '/auth/callback') {
        // Parse the hash fragment for ID token
        const urlParams = new URLSearchParams(
          window.location.hash.substring(1)
        );

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
        } else {
          // No ID token found in URL parameters
        }
      } else {
        // Not on callback route
      }
    } else {
      // Not in browser environment
    }
  }, [onPress]);

  // Listen for messages from popup window (main window only)
  React.useEffect(() => {
    if (typeof window !== 'undefined' && !window.opener) {
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return;
        }

        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          onPress(event.data.idToken);
        } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
          console.error(
            '❌ SignInWithGoogleButton: Received GOOGLE_AUTH_ERROR message'
          );
          // Call with empty string to indicate error
          onPress('');
        } else {
          // Received message with unexpected type
        }
      };

      window.addEventListener('message', handleMessage);

      return () => {
        window.removeEventListener('message', handleMessage);
      };
    } else {
      // Not setting up message listener (not main window or not browser)
    }
  }, [onPress]);

  const handlePress = async () => {
    try {
      if (disabled) {
        return;
      }

      // Check if we're on web platform and need to handle popup flow
      if (typeof window !== 'undefined' && request?.url) {
        // Open OAuth URL in a popup window
        const popup = window.open(
          request.url,
          'google-oauth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        if (!popup) {
          throw new Error(
            'Popup blocked by browser. Please allow popups for this site.'
          );
        }

        // The popup will handle the OAuth flow and send a message back
        // We don't need to wait for promptAsync result in this case

        // Add a check to see if the popup is still open
        const checkPopup = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkPopup);
          }
        }, 1000);

        return;
      }

      // Using promptAsync for native platforms
      const result = await promptAsync();

      if (result?.type === 'success') {
        // Get the ID token from the result
        const { id_token } = result.params;
        if (id_token) {
          onPress(id_token);
        } else {
          console.error(
            '❌ SignInWithGoogleButton: No ID token in result params'
          );
          onPress('');
        }
      } else if (result?.type === 'cancel') {
        // User cancelled the OAuth flow
      } else if (result?.type === 'error') {
        console.error(
          '❌ SignInWithGoogleButton: promptAsync error:',
          result.error
        );
        // Call with empty string to indicate error
        onPress('');
      } else {
        // Unexpected promptAsync result type
      }
    } catch (error) {
      console.error('❌ SignInWithGoogleButton: handlePress error:', error);
      // Call with empty string to indicate error
      onPress('');
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
