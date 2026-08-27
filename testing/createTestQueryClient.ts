import { QueryClient, QueryClientConfig } from '@tanstack/react-query';
import { act } from '@testing-library/react-native';

export function createTestQueryClient(
  config: QueryClientConfig = {}
): QueryClient {
  return new QueryClient({
    ...config,
    defaultOptions: {
      ...config.defaultOptions,
      queries: {
        retry: false,
        gcTime: 0,
        ...config.defaultOptions?.queries,
      },
      mutations: {
        retry: false,
        gcTime: 0,
        ...config.defaultOptions?.mutations,
      },
    },
  });
}

export async function disposeTestQueryClient(client: QueryClient): Promise<void> {
  await client.cancelQueries();
  client.clear();
  await act(async () => {
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
}
