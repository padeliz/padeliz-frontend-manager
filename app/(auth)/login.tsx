/**
 * Login Page
 * Handles Google OAuth authentication for managers
 */

import SignInWithGoogleButton from '@/components/SignInWithGoogleButton';
import { useAuth } from '@/context/managerAuth';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

export default function LoginScreen() {
  const { signInWithGoogle, error, clearError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);


  const handleGoogleSignIn = async (token?: string) => {
    if (!token || token.trim() === '') {
      console.error('❌ LoginScreen: No token provided to handleGoogleSignIn');
      Alert.alert('Error', 'Failed to get Google authentication token');
      return;
    }

    try {
      setIsLoading(true);
      clearError();
      // Wait for authentication to complete
      await signInWithGoogle(token);

      // Only redirect AFTER successful authentication

      router.replace('/(app)');
    } catch (error: any) {
      console.error('❌ LoginScreen: Authentication failed with error:', error);

      // Show error and stay on login page
      Alert.alert(
        'Login Failed',
        error.message || 'An error occurred during login'
      );
    } finally {
      // Always clear loading state
      setIsLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="flex-1 justify-center px-6 py-12">
        {/* Header */}
        <View className="text-center mb-12">
          <Text className="text-4xl font-bold text-gray-900 mb-4">
            Padeliz Manager
          </Text>
          <Text className="text-lg text-gray-600">
            Sign in to manage your padel clubs and tournaments
          </Text>
        </View>

        {/* Login Card */}
        <View className="bg-white rounded-2xl shadow-xl p-8">
          <Text className="text-2xl font-semibold text-center text-gray-900 mb-8">
            Welcome Back
          </Text>

          {/* Google Sign In Button */}
          <SignInWithGoogleButton
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          />

          {/* Error Display */}
          {error && (
            <View className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <Text className="text-red-800 font-semibold mb-2">Error:</Text>
              <Text className="text-red-700">{error}</Text>
            </View>
          )}

          {/* Loading State */}
          {isLoading && (
            <View className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Text className="text-blue-800 text-center">
                Signing you in...
              </Text>
            </View>
          )}

          {/* Info */}
          <View className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Text className="text-blue-800 text-sm text-center">
              You need a Google account with manager privileges to access this
              app.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View className="mt-8 text-center">
          <Text className="text-gray-500 text-sm">
            Version 1.0.0 • Padeliz Manager App
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
