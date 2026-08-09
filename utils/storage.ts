/**
 * Cross-Platform Storage Utility
 * Provides consistent storage API across web, iOS, and Android
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Storage interface for cross-platform compatibility
 */
interface StorageInterface {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Web storage implementation using localStorage
 */
class WebStorage implements StorageInterface {
  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    } catch (error) {
      console.error('Web storage getItem error:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Web storage setItem error:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Web storage removeItem error:', error);
    }
  }
}

/**
 * Native storage implementation using expo-secure-store
 */
class NativeStorage implements StorageInterface {
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Native storage getItem error:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Native storage setItem error:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Native storage removeItem error:', error);
    }
  }
}

/**
 * Get the appropriate storage implementation for the current platform
 */
function getStorage(): StorageInterface {
  if (Platform.OS === 'web') {
    return new WebStorage();
  } else {
    return new NativeStorage();
  }
}

// Export singleton instance
export const storage = getStorage();

/**
 * Convenience functions for common storage operations
 */
export const storageUtils = {
  /**
   * Store a value in storage
   */
  async set(key: string, value: any): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await storage.setItem(key, serializedValue);
    } catch (error) {
      console.error('Storage set error:', error);
    }
  },

  /**
   * Get a value from storage
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await storage.getItem(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },

  /**
   * Remove a value from storage
   */
  async remove(key: string): Promise<void> {
    try {
      await storage.removeItem(key);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  },

  /**
   * Clear all storage (web only - localStorage.clear())
   */
  async clear(): Promise<void> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.clear();
      } catch (error) {
        console.error('Storage clear error:', error);
      }
    }
  }
};
