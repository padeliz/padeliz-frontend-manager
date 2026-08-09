/**
 * Application Constants
 *
 * This file centralizes all constants used across the application.
 * Import from this file instead of defining constants in individual files.
 */

// API Configuration
export const API_VERSION = process.env.EXPO_PUBLIC_API_VERSION;
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
export const API_MANAGER_PREFIX = process.env.EXPO_PUBLIC_API_MANAGER_PREFIX;

// App Configuration
export const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME;
export const APP_VERSION = process.env.EXPO_PUBLIC_APP_VERSION;
export const DEBUG_MODE = process.env.EXPO_PUBLIC_DEBUG_MODE === '1';
export const LOG_LEVEL = process.env.EXPO_PUBLIC_LOG_LEVEL;

// Google OAuth Constants
export const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

// Environment Constants
export const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;
export const APP_SCHEME = process.env.EXPO_PUBLIC_SCHEME;
