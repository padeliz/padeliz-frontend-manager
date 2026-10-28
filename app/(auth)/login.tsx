/**
 * Login Page
 * Handles Google OAuth authentication for managers via BFF
 */

import SignInWithGoogleButton from '@/components/SignInWithGoogleButton';
import { useAuth } from '@/context/managerAuth';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

export default function LoginScreen() {
  const { signIn, user, error, clearError, isLoading } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (user && !redirectedRef.current && isSigningIn) {
      redirectedRef.current = true;
      router.replace('/(app)');
    }
  }, [user, isSigningIn]);

  useEffect(() => {
    if (error && isSigningIn) {
      setIsSigningIn(false);
    }
  }, [error, isSigningIn]);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      clearError();
      await signIn();
    } catch (err: any) {
      console.error('❌ LoginScreen: Authentication failed with error:', err);
      Alert.alert(
        'Login Failed',
        err.message || 'An error occurred during login'
      );
      setIsSigningIn(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="flex-1 justify-center px-6 py-12">
        <View className="text-center mb-12">
          <Text className="text-4xl font-bold text-gray-900 mb-4">
            Padeliz Manager
          </Text>
          <Text className="text-lg text-gray-600">
            Sign in to manage your padel clubs and tournaments
          </Text>
        </View>

        <View className="bg-white rounded-2xl shadow-xl p-8">
          <Text className="text-2xl font-semibold text-center text-gray-900 mb-8">
            Welcome Back
          </Text>

          <SignInWithGoogleButton
            onPress={handleGoogleSignIn}
            disabled={isSigningIn || isLoading}
          />

          {error && (
            <View className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <Text className="text-red-800 font-semibold mb-2">Error:</Text>
              <Text className="text-red-700">{error}</Text>
            </View>
          )}

          {(isSigningIn || isLoading) && (
            <View className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Text className="text-blue-800 text-center">
                Signing you in...
              </Text>
            </View>
          )}

          <View className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Text className="text-blue-800 text-sm text-center">
              You need a Google account with manager privileges to access this
              app.
            </Text>
          </View>
        </View>

        <View className="mt-8 text-center">
          <Text className="text-gray-500 text-sm">
            Version 1.0.0 • Padeliz Manager App
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
