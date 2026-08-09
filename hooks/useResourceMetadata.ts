/**
 * Resource Metadata Hook
 * Fetches and caches resource metadata for multiple schemas in parallel
 */

import { ApiResourceMetadataApiService } from '@/services/api/resourceMetadataApi';
import { ApiResourceMetadata } from '@/types/api/metadata';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useErrorHandler } from './useErrorHandler';

interface MetadataCache {
  [schema: string]: ApiResourceMetadata;
}

interface UseApiResourceMetadataReturn {
  metadata: Record<string, ApiResourceMetadata>;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  getMetadata: (schema: string) => ApiResourceMetadata | null;
  isLoading: (schema: string) => boolean;
  getError: (schema: string) => string | null;
  fetchMetadata: (schema: string) => Promise<void>;
  refetch: (schema: string) => Promise<void>;
  clearCache: (schema: string) => Promise<void>;
  clearAllCache: () => Promise<void>;
}

const metadataApi = new ApiResourceMetadataApiService();

// Deep equality check for objects
function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== typeof obj2) return false;
  if (typeof obj1 !== 'object') return obj1 === obj2;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (let key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
}

export function useResourceMetadata(
  schemas: string[] = []
): UseApiResourceMetadataReturn {
  // Use refs for the actual state to prevent unnecessary re-renders
  const metadataRef = useRef<Record<string, ApiResourceMetadata>>({});
  const loadingRef = useRef<Record<string, boolean>>({});
  const errorsRef = useRef<Record<string, string | null>>({});

  // Use state only for triggering re-renders when absolutely necessary
  const [renderTrigger, setRenderTrigger] = useState(0);

  const { handleApiError } = useErrorHandler();

  // Cache to avoid refetching metadata
  const cacheRef = useRef<MetadataCache>({});
  const abortControllersRef = useRef<Record<string, AbortController>>({});

  // Force re-render when needed - stable function
  const forceRender = useCallback(() => {
    setRenderTrigger(prev => prev + 1);
  }, []);

  const fetchMetadata = useCallback(
    async (schema: string) => {
      // Check cache first
      if (cacheRef.current[schema]) {
        // Only update if the content is different
        if (!deepEqual(metadataRef.current[schema], cacheRef.current[schema])) {
          metadataRef.current[schema] = cacheRef.current[schema];
          loadingRef.current[schema] = false;
          errorsRef.current[schema] = null;
          forceRender();
        }
        return;
      }

      // Set loading state
      loadingRef.current[schema] = true;
      errorsRef.current[schema] = null;
      forceRender();

      // Cancel previous request if still pending
      if (abortControllersRef.current[schema]) {
        abortControllersRef.current[schema].abort();
      }

      // Create new abort controller
      abortControllersRef.current[schema] = new AbortController();

      try {
        const response = await metadataApi.getApiResourceMetadata(schema);

        // Cache the metadata
        cacheRef.current[schema] = response.data;

        // Update state
        metadataRef.current[schema] = response.data;
        loadingRef.current[schema] = false;
        errorsRef.current[schema] = null;
        forceRender();
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return;
        }

        const errorMessage = err.message || 'Failed to fetch metadata';
        loadingRef.current[schema] = false;
        errorsRef.current[schema] = errorMessage;
        forceRender();

        // Use handleApiError for proper error handling
        handleApiError(err);
      } finally {
        delete abortControllersRef.current[schema];
      }
    },
    [handleApiError, forceRender]
  );

  const refetch = useCallback(
    async (schema: string) => {
      // Clear cache for this schema
      delete cacheRef.current[schema];
      await fetchMetadata(schema);
    },
    [fetchMetadata]
  );

  const clearCache = useCallback(
    async (schema: string) => {
      try {
        await metadataApi.clearApiResourceMetadataCache(schema);
        // Clear local cache
        delete cacheRef.current[schema];
        delete metadataRef.current[schema];
        delete loadingRef.current[schema];
        delete errorsRef.current[schema];
        forceRender();
      } catch (err) {
        console.error(
          'Failed to clear metadata cache for schema:',
          schema,
          err
        );
        handleApiError(err);
      }
    },
    [handleApiError, forceRender]
  );

  const clearAllCache = useCallback(async () => {
    try {
      // Clear all caches on the server
      await Promise.all(
        Object.keys(cacheRef.current).map(schema =>
          metadataApi.clearApiResourceMetadataCache(schema)
        )
      );

      // Clear local cache
      cacheRef.current = {};
      metadataRef.current = {};
      loadingRef.current = {};
      errorsRef.current = {};
      forceRender();
    } catch (err) {
      console.error('Failed to clear all metadata caches:', err);
      handleApiError(err);
    }
  }, [handleApiError, forceRender]);

  // Helper functions - read directly from refs
  const getMetadata = useCallback((schema: string) => {
    return metadataRef.current[schema] || null;
  }, []);

  const isLoading = useCallback((schema: string) => {
    return loadingRef.current[schema] || false;
  }, []);

  const getError = useCallback((schema: string) => {
    return errorsRef.current[schema] || null;
  }, []);

  // Track the last schemas to prevent unnecessary re-fetches
  const lastSchemasRef = useRef<string[]>([]);

  // Fetch metadata for all provided schemas
  useEffect(() => {
    // Check if schemas have actually changed
    const schemasChanged = !deepEqual(schemas, lastSchemasRef.current);
    if (!schemasChanged) {
      return;
    }

    // Update the last schemas reference
    lastSchemasRef.current = [...schemas];

    if (schemas.length > 0) {
      schemas.forEach(schema => {
        if (schema && !cacheRef.current[schema]) {
          fetchMetadata(schema);
        }
      });
    }

    // Cleanup on unmount
    return () => {
      Object.values(abortControllersRef.current).forEach(controller => {
        if (controller) {
          controller.abort();
        }
      });
      abortControllersRef.current = {};
    };
  }, [schemas, fetchMetadata]); // Keep fetchMetadata in dependencies but make it stable

  return {
    metadata: metadataRef.current,
    loading: loadingRef.current,
    errors: errorsRef.current,
    getMetadata,
    isLoading,
    getError,
    fetchMetadata,
    refetch,
    clearCache,
    clearAllCache,
  };
}
