import { queryKeys } from '@/lib/queryClient';
import { PlayersApiService } from '@/services/api/playersApi';
import { ApiPlayer } from '@/types/api/entities';
import { DropdownOption } from '@/types/ui/dropdowns';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

const playersApi = new PlayersApiService();

export type UserPickerRole = 'player' | 'manager';

export const USER_PICKER_MAX_PER_PAGE = 100;
export const USER_PICKER_MIN_QUERY_CHARS = 2;
export const USER_PICKER_DEBOUNCE_MS = 300;

/** @deprecated Prefer USER_PICKER_* — kept for existing player-picker imports */
export const PLAYER_PICKER_MAX_PER_PAGE = USER_PICKER_MAX_PER_PAGE;
export const PLAYER_PICKER_MIN_QUERY_CHARS = USER_PICKER_MIN_QUERY_CHARS;
export const PLAYER_PICKER_DEBOUNCE_MS = USER_PICKER_DEBOUNCE_MS;

function userName(user: ApiPlayer): string {
  return (
    user?.name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    `User #${user?.id_user}`
  );
}

function toOption(user: ApiPlayer): DropdownOption {
  return {
    label: userName(user),
    value: user.id_user,
    imageUrl: user.pdf_avatar_url ?? null,
  };
}

export function playerToDropdownOption(player: ApiPlayer): DropdownOption {
  return toOption(player);
}

export function useUserPicker({
  role = 'player',
  preloadCount = USER_PICKER_MAX_PER_PAGE,
  selectedValue,
}: {
  role?: UserPickerRole;
  preloadCount?: number;
  selectedValue?: string | number | boolean | null;
} = {}) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const lastSelectedRef = useRef<DropdownOption | null>(null);

  useEffect(() => {
    const handle = setTimeout(
      () => setDebouncedSearch(search),
      USER_PICKER_DEBOUNCE_MS
    );
    return () => clearTimeout(handle);
  }, [search]);

  const q =
    debouncedSearch.trim().length >= USER_PICKER_MIN_QUERY_CHARS
      ? debouncedSearch.trim()
      : '';
  const perPage = Math.min(
    Math.max(1, preloadCount),
    USER_PICKER_MAX_PER_PAGE
  );

  const hasUserType = role === 'manager' ? 'manager' : undefined;

  const listQuery = useQuery({
    queryKey: queryKeys.playersPicker({
      q: q || undefined,
      page: 1,
      per_page: perPage,
      role,
    }),
    queryFn: async () => {
      const res = await playersApi.getPlayers({
        page: 1,
        per_page: perPage,
        ...(q ? { q } : {}),
        ...(hasUserType
          ? { filters: { has_user_type: hasUserType } }
          : {}),
      });
      return res.data || [];
    },
    staleTime: 5 * 60_000,
  });

  const selectedId =
    selectedValue != null && selectedValue !== ''
      ? Number(selectedValue)
      : null;
  const selectedMissing =
    selectedId != null &&
    Number.isFinite(selectedId) &&
    !(listQuery.data || []).some(p => p.id_user === selectedId);

  const selectedQuery = useQuery({
    queryKey: ['player', selectedId, role],
    queryFn: async () => {
      const res = await playersApi.getPlayer(selectedId!);
      return res.data;
    },
    enabled: selectedMissing,
    staleTime: 5 * 60_000,
  });

  const options = useMemo(() => {
    const mapped = (listQuery.data || []).map(toOption);
    if (selectedId == null || !Number.isFinite(selectedId)) {
      return mapped;
    }
    if (mapped.some(o => Number(o.value) === selectedId)) {
      return mapped;
    }
    if (selectedQuery.data) {
      return [toOption(selectedQuery.data), ...mapped];
    }
    if (
      lastSelectedRef.current &&
      Number(lastSelectedRef.current.value) === selectedId
    ) {
      return [lastSelectedRef.current, ...mapped];
    }
    return mapped;
  }, [listQuery.data, selectedId, selectedQuery.data]);

  useEffect(() => {
    if (selectedId == null) return;
    const found = options.find(o => Number(o.value) === selectedId);
    if (found) lastSelectedRef.current = found;
  }, [options, selectedId]);

  return {
    options,
    onSearch: setSearch,
    loading: listQuery.isFetching || selectedQuery.isFetching,
  };
}
