/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */

import { Ionicons } from '@expo/vector-icons';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View className="flex-1 justify-center items-center p-6 bg-gray-50">
          <View className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <View className="items-center mb-4">
              <Ionicons
                name="warning"
                size={48}
                className="text-red-500 mb-2"
              />
              <Text className="text-xl font-bold text-gray-900 text-center">
                Something went wrong
              </Text>
            </View>

            <Text className="text-gray-600 text-center mb-6">
              An unexpected error occurred. Please try again or contact support if the problem persists.
            </Text>

            {__DEV__ && this.state.error && (
              <View className="mb-4 p-3 bg-red-50 rounded border border-red-200">
                <Text className="text-red-800 text-sm font-mono">
                  {this.state.error.message}
                </Text>
                {this.state.errorInfo && (
                  <Text className="text-red-600 text-xs mt-2 font-mono">
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}

            <Pressable
              onPress={this.handleRetry}
              className="bg-blue-500 rounded-lg py-3 px-6"
            >
              <Text className="text-white font-semibold text-center">
                Try Again
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}
