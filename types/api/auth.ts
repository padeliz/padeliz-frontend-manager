/**
 * API Authentication Types
 * Authentication-related types from the backend API
 */

import { ApiPlayer } from './entities';

export interface ApiAuthUser {
  id: number;
  name: string;
  email: string;
  userType: string;
  google_avatar?: string;
}

export interface ApiLoginResponse {
  token: string;
  player: ApiPlayer;
  user_type: string;
}
