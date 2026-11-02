import {
  PLAYER_PICKER_DEBOUNCE_MS,
  PLAYER_PICKER_MAX_PER_PAGE,
  PLAYER_PICKER_MIN_QUERY_CHARS,
  playerToDropdownOption,
  useUserPicker,
} from '@/hooks/useUserPicker';

export {
  PLAYER_PICKER_DEBOUNCE_MS,
  PLAYER_PICKER_MAX_PER_PAGE,
  PLAYER_PICKER_MIN_QUERY_CHARS,
  playerToDropdownOption,
};

/** Thin alias: always uses the player directory. */
export function usePlayerPicker({
  preloadCount = PLAYER_PICKER_MAX_PER_PAGE,
  selectedValue,
}: {
  preloadCount?: number;
  selectedValue?: string | number | boolean | null;
} = {}) {
  return useUserPicker({
    role: 'player',
    preloadCount,
    selectedValue,
  });
}
