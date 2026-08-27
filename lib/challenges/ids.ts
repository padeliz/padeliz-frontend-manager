import * as Crypto from 'expo-crypto';

export function newClientId(): string {
  return Crypto.randomUUID();
}
