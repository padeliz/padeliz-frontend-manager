type PaginatedFetcher<T> = (page: number) => Promise<{
  data: T[];
  meta?: { last_page?: number };
}>;

export async function fetchAllPaginated<T>(
  fetchPage: PaginatedFetcher<T>,
  perPage = 100
): Promise<{ data: T[]; meta?: Record<string, unknown> }> {
  const all: T[] = [];
  let lastMeta: Record<string, unknown> | undefined;
  let page = 1;
  let lastPage = 1;

  do {
    const res = await fetchPage(page);
    all.push(...(res.data || []));
    lastMeta = res.meta as Record<string, unknown> | undefined;
    lastPage = Number(res.meta?.last_page ?? page);
    page += 1;
  } while (page <= lastPage);

  return { data: all, meta: lastMeta };
}
