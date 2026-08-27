import type { Ionicons } from '@expo/vector-icons';

export const CHALLENGE_ICON_COLORS = {
  gray: '#6b7280',
  black: '#111827',
  orange: '#ea580c',
  blue: '#2563eb',
  green: '#16a34a',
} as const;

export const CHALLENGE_HEADER_ICON_SIZE = 18;
export const CHALLENGE_ROW_ICON_SIZE = 20;
export const CHALLENGE_LB_STAR_SIZE = 14;

export const CHALLENGE_ICONS = {
  undo: {
    name: 'arrow-undo-outline' as keyof typeof Ionicons.glyphMap,
    color: CHALLENGE_ICON_COLORS.gray,
  },
  complete: {
    name: 'flag-outline' as keyof typeof Ionicons.glyphMap,
    color: CHALLENGE_ICON_COLORS.gray,
  },
  returnToWaiting: {
    name: 'arrow-down-circle-outline' as keyof typeof Ionicons.glyphMap,
    color: CHALLENGE_ICON_COLORS.black,
  },
  jumpIn: {
    name: 'arrow-up-circle-outline' as keyof typeof Ionicons.glyphMap,
    color: CHALLENGE_ICON_COLORS.black,
  },
  remove: {
    name: 'trash-outline' as keyof typeof Ionicons.glyphMap,
    color: CHALLENGE_ICON_COLORS.orange,
  },
  confirmAttempt: {
    name: 'checkmark-outline' as keyof typeof Ionicons.glyphMap,
    color: CHALLENGE_ICON_COLORS.blue,
  },
  trophy: {
    name: 'trophy-outline' as keyof typeof Ionicons.glyphMap,
    color: CHALLENGE_ICON_COLORS.green,
  },
  requeue: {
    name: 'add-circle-outline' as keyof typeof Ionicons.glyphMap,
    color: CHALLENGE_ICON_COLORS.black,
  },
  star: {
    name: 'star' as keyof typeof Ionicons.glyphMap,
    color: CHALLENGE_ICON_COLORS.green,
  },
} as const;
