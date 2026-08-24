/**
 * Resource Metadata Hook
 * Fetches and caches resource metadata for multiple schemas in parallel.
 * Module-scoped cache survives navigations; in-flight requests are deduped.
 */

import { ApiResourceMetadataApiService } from '@/services/api/resourceMetadataApi';
import { ApiResourceMetadata } from '@/types/api/metadata';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useErrorHandler } from './useErrorHandler';

interface UseApiResourceMetadataReturn {
  metadata: Record<string, ApiResourceMetadata>;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  getMetadata: (schema: string) => ApiResourceMetadata | null;
  isLoading: (schema: string) => boolean;
  getError: (schema: string) => string | null;
  fetchMetadata: (schema: string) => Promise<void>;
  refetch: (schema: string) => Promise<void>;
}

const metadataApi = new ApiResourceMetadataApiService();

/** Shared across all hook instances for the browser/app session */
const sharedCache: Record<string, ApiResourceMetadata> = {};
const inFlight: Record<string, Promise<ApiResourceMetadata>> = {};

function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== typeof obj2) return false;
  if (typeof obj1 !== 'object') return obj1 === obj2;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  return true;
}

async function loadSchema(schema: string): Promise<ApiResourceMetadata> {
  if (sharedCache[schema]) {
    return sharedCache[schema];
  }
  if (inFlight[schema]) {
    return inFlight[schema];
  }
  inFlight[schema] = metadataApi
    .getApiResourceMetadata(schema)
    .then(response => {
      sharedCache[schema] = response.data;
      delete inFlight[schema];
      return response.data;
    })
    .catch(err => {
      delete inFlight[schema];
      throw err;
    });
  return inFlight[schema];
}

/** Test helper */
export function __resetResourceMetadataModuleCache(): void {
  Object.keys(sharedCache).forEach(k => delete sharedCache[k]);
  Object.keys(inFlight).forEach(k => delete inFlight[k]);
}

export function useResourceMetadata(
  schemas: string[] = []
): UseApiResourceMetadataReturn {
  const metadataRef = useRef<Record<string, ApiResourceMetadata>>({});
  const loadingRef = useRef<Record<string, boolean>>({});
  const errorsRef = useRef<Record<string, string | null>>({});
  const [, setRenderTrigger] = useState(0);
  const { handleApiError } = useErrorHandler();

  const forceRender = useCallback(() => {
    setRenderTrigger(prev => prev + 1);
  }, []);

  const fetchMetadata = useCallback(
    async (schema: string) => {
      if (sharedCache[schema]) {
        if (!deepEqual(metadataRef.current[schema], sharedCache[schema])) {
          metadataRef.current[schema] = sharedCache[schema];
          loadingRef.current[schema] = false;
          errorsRef.current[schema] = null;
          forceRender();
        } else {
          loadingRef.current[schema] = false;
        }
        return;
      }

      loadingRef.current[schema] = true;
      errorsRef.current[schema] = null;
      forceRender();

      try {
        const data = await loadSchema(schema);
        metadataRef.current[schema] = data;
        loadingRef.current[schema] = false;
        errorsRef.current[schema] = null;
        forceRender();
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return;
        }
        const errorMessage = err.message || 'Failed to fetch metadata';
        loadingRef.current[schema] = false;
        errorsRef.current[schema] = errorMessage;
        forceRender();
        handleApiError(err);
      }
    },
    [handleApiError, forceRender]
  );

  const refetch = useCallback(
    async (schema: string) => {
      delete sharedCache[schema];
      delete inFlight[schema];
      await fetchMetadata(schema);
    },
    [fetchMetadata]
  );

  const getMetadata = useCallback((schema: string) => {
    return metadataRef.current[schema] || sharedCache[schema] || null;
  }, []);

  const isLoading = useCallback((schema: string) => {
    return loadingRef.current[schema] || false;
  }, []);

  const getError = useCallback((schema: string) => {
    return errorsRef.current[schema] || null;
  }, []);

  const lastSchemasRef = useRef<string[]>([]);

  useEffect(() => {
    const schemasChanged =
      schemas.length !== lastSchemasRef.current.length ||
      schemas.some((s, i) => s !== lastSchemasRef.current[i]);

    if (!schemasChanged) return;
    lastSchemasRef.current = [...schemas];

    schemas.forEach(schema => {
      if (schema) {
        if (sharedCache[schema] && !metadataRef.current[schema]) {
          metadataRef.current[schema] = sharedCache[schema];
        }
        fetchMetadata(schema);
      }
    });
    forceRender();
  }, [schemas, fetchMetadata, forceRender]);

  return {
    metadata: metadataRef.current,
    loading: loadingRef.current,
    errors: errorsRef.current,
    getMetadata,
    isLoading,
    getError,
    fetchMetadata,
    refetch,
  };
}
