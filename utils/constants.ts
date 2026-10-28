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

// Authentication Constants (BFF JWT cookies — same shape as player app)
export const COOKIE_NAME = 'auth_token';
export const REFRESH_COOKIE_NAME = 'refresh_token';
export const COOKIE_MAX_AGE = 20; // 20 seconds
export const JWT_EXPIRATION_TIME = '20s';
export const REFRESH_TOKEN_EXPIRY = '30d';
export const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60;

// Google OAuth Constants (server-only — never EXPO_PUBLIC_)
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
export const GOOGLE_REDIRECT_URI = `${process.env.EXPO_PUBLIC_BASE_URL}/api/auth/callback`;
export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

// Environment Constants
export const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;
export const APP_SCHEME = process.env.EXPO_PUBLIC_SCHEME;
export const JWT_SECRET = process.env.JWT_SECRET!;

// Cookie Settings
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'Lax' as const,
  path: '/',
  maxAge: COOKIE_MAX_AGE,
};

export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'Lax' as const,
  path: '/api/auth/refresh',
  maxAge: REFRESH_TOKEN_MAX_AGE,
};
