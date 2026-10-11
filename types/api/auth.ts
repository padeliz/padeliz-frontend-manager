/**
 * API Authentication Types
 * Authentication-related types from the backend API
 */

import { ApiPlayer } from './entities';

/** Manager session user — same wire shape as `UserResource` / login `user`. */
export type ApiAuthUser = ApiPlayer;

export interface ApiLoginResponse {
  token: string;
  user: ApiPlayer;
  user_type: string;
}
