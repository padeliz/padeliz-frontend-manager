import React from 'react';
import { Text, View } from 'react-native';

export const PARTICIPATION_FLAG_CONFIG = {
  duplicate: {
    label: 'Duplicate',
    chipClass: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  not_registered: {
    label: 'Not registered',
    chipClass: 'bg-blue-100 text-blue-900 border-blue-300',
  },
} as const;

type FlagKey = keyof typeof PARTICIPATION_FLAG_CONFIG;

type Props = {
  flags?: string[];
  participationId: number;
};

export default function ParticipationFlagBadges({ flags, participationId }: Props) {
  if (!flags?.length) return null;

  return (
    <View className="flex-row gap-1">
      {flags.map(flag => {
        const config = PARTICIPATION_FLAG_CONFIG[flag as FlagKey];
        if (!config) return null;
        return (
          <Text
            key={`${flag}-${participationId}`}
            testID={`participation-flag-${flag}-${participationId}`}
            className={`text-xs px-2 py-0.5 rounded border ${config.chipClass}`}
            numberOfLines={1}
          >
            {config.label}
          </Text>
        );
      })}
    </View>
  );
}
