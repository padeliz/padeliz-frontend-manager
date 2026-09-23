/**
 * Shared PDF avatar reload state for CachedPdfImageReload slots.
 */

import { PlayersApiService } from '@/services/api/playersApi';
import { useCallback, useState } from 'react';

const playersApi = new PlayersApiService();

export function useCachedPdfAvatarReload() {
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [spinning, setSpinning] = useState<Record<number, boolean>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});

  const urlFor = useCallback(
    (key: number, baseUrl: string | null | undefined): string | null => {
      return overrides[key] ?? baseUrl ?? null;
    },
    [overrides]
  );

  const reload = useCallback(
    async ({
      key,
      playerId,
      collecting,
    }: {
      key: number;
      playerId: number;
      collecting: boolean;
    }) => {
      if (spinning[key]) return;

      if (!Number.isFinite(playerId)) {
        setErrors(prev => ({
          ...prev,
          [key]: 'Missing player for avatar.',
        }));
        return;
      }

      setSpinning(prev => ({ ...prev, [key]: true }));
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });

      try {
        const res = await playersApi.generatePdfAvatar(playerId, collecting);
        const url = res?.data?.pdf_avatar_url ?? null;
        if (url) {
          setOverrides(prev => ({ ...prev, [key]: url }));
        } else {
          setErrors(prev => ({
            ...prev,
            [key]: 'Avatar URL missing in response.',
          }));
        }
      } catch (e: any) {
        setErrors(prev => ({
          ...prev,
          [key]: e?.message || 'Failed to generate avatar.',
        }));
      } finally {
        setSpinning(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [spinning]
  );

  return {
    overrides,
    spinning,
    errors,
    urlFor,
    reload,
  };
}
