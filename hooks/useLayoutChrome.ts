import {
  buildLayoutChromeHref,
  parseLayoutChromeParams,
  stripLayoutChromeQuery,
} from '@/utils/layoutChrome';
import {
  useGlobalSearchParams,
  useLocalSearchParams,
  usePathname,
  useRouter,
} from 'expo-router';
import { useCallback, useMemo } from 'react';

function mergeSearchParams(
  globalParams: Record<string, string | string[] | undefined>,
  localParams: Record<string, string | string[] | undefined>
): Record<string, string | string[] | undefined> {
  return { ...globalParams, ...localParams };
}

export function useLayoutChrome() {
  const router = useRouter();
  const pathname = usePathname();
  const globalParams = useGlobalSearchParams();
  const localParams = useLocalSearchParams();
  const mergedParams = useMemo(
    () =>
      mergeSearchParams(
        globalParams as Record<string, string | string[] | undefined>,
        localParams as Record<string, string | string[] | undefined>
      ),
    [globalParams, localParams]
  );

  const { visibility, isFullscreen } = useMemo(
    () => parseLayoutChromeParams(mergedParams),
    [mergedParams]
  );

  const enterFullscreen = useCallback(() => {
    const href = buildLayoutChromeHref(pathname, mergedParams, { fs: true });
    router.push(href as never);
  }, [mergedParams, pathname, router]);

  const exitFullscreen = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    const href = buildLayoutChromeHref(
      pathname,
      stripLayoutChromeQuery(mergedParams) as Record<
        string,
        string | string[] | undefined
      >,
      {}
    );
    router.replace(href as never);
  }, [mergedParams, pathname, router]);

  return {
    visibility,
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
  };
}
