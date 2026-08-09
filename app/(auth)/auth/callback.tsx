/**
 * OAuth Callback Page
 * Handles the OAuth callback from Google and processes the authentication response
 */

import { useAuth } from '@/context/managerAuth';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function AuthCallbackScreen() {
  const { signInWithGoogle } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processOAuthResponse = async () => {
      try {
        setIsProcessing(true);
        setError(null);

        if (typeof window === 'undefined') {
          return;
        }

        // Parse the hash fragment for ID token
        const urlParams = new URLSearchParams(
          window.location.hash.substring(1)
        );

        const idToken = urlParams.get('id_token');

        if (!idToken) {
          throw new Error('No ID token found in OAuth response');
        }

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
          await signInWithGoogle(idToken);

          // Redirect to dashboard after successful authentication
          router.replace('/(app)');
        }
      } catch (error: any) {
        console.error('❌ AuthCallbackScreen: OAuth processing failed:', error);
        setError(error.message || 'Failed to process OAuth response');

        // If this is a popup, notify the parent about the error
        if (typeof window !== 'undefined' && window.opener) {
          window.opener.postMessage(
            {
              type: 'GOOGLE_AUTH_ERROR',
              error: error.message || 'Authentication failed',
            },
            window.location.origin
          );

          // Close the popup after a short delay
          setTimeout(() => window.close(), 2000);
        }
      } finally {
        setIsProcessing(false);
      }
    };

    // Process the OAuth response
    processOAuthResponse();
  }, [signInWithGoogle]);

  if (isProcessing) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-lg text-gray-600">Processing authentication...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 px-6">
        <Text className="text-2xl font-bold text-red-600 mb-4">Authentication Failed</Text>
        <Text className="text-lg text-gray-600 text-center mb-6">{error}</Text>
        <Text className="text-sm text-gray-500 text-center">
          This window will close automatically. Please try signing in again.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center items-center bg-gray-50">
      <Text className="text-lg text-gray-600">Redirecting...</Text>
    </View>
  );
}
