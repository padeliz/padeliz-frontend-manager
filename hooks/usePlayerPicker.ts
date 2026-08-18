import { queryKeys } from '@/lib/queryClient';
import { PlayersApiService } from '@/services/api/playersApi';
import { ApiPlayer } from '@/types/api/entities';
import { DropdownOption } from '@/types/ui/dropdowns';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

const playersApi = new PlayersApiService();

export const PLAYER_PICKER_MAX_PER_PAGE = 100;
export const PLAYER_PICKER_MIN_QUERY_CHARS = 2;
export const PLAYER_PICKER_DEBOUNCE_MS = 300;

function playerName(player: ApiPlayer): string {
  return (
    player?.name ||
    [player?.first_name, player?.last_name].filter(Boolean).join(' ') ||
    `Player #${player?.id_player}`
  );
}

function toOption(player: ApiPlayer): DropdownOption {
  return {
    label: playerName(player),
    value: player.id_player,
    imageUrl: player.pdf_avatar_url ?? null,
  };
}

export function playerToDropdownOption(player: ApiPlayer): DropdownOption {
  return toOption(player);
}

export function usePlayerPicker({
  preloadCount = PLAYER_PICKER_MAX_PER_PAGE,
  selectedValue,
}: {
  preloadCount?: number;
  selectedValue?: string | number | boolean | null;
} = {}) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const lastSelectedRef = useRef<DropdownOption | null>(null);

  useEffect(() => {
    const handle = setTimeout(
      () => setDebouncedSearch(search),
      PLAYER_PICKER_DEBOUNCE_MS
    );
    return () => clearTimeout(handle);
  }, [search]);

  const q =
    debouncedSearch.trim().length >= PLAYER_PICKER_MIN_QUERY_CHARS
      ? debouncedSearch.trim()
      : '';
  const perPage = Math.min(
    Math.max(1, preloadCount),
    PLAYER_PICKER_MAX_PER_PAGE
  );

  const listQuery = useQuery({
    queryKey: queryKeys.playersPicker({
      q: q || undefined,
      page: 1,
      per_page: perPage,
    }),
    queryFn: async () => {
      const res = await playersApi.getPlayers({
        page: 1,
        per_page: perPage,
        ...(q ? { q } : {}),
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
    !(listQuery.data || []).some(p => p.id_player === selectedId);

  const selectedQuery = useQuery({
    queryKey: ['player', selectedId],
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
