/**
 * M2M picker for a division's level bands. Bands come from the read-only
 * `levels` API. Picking bands never touches `level_min` / `level_max`: those
 * are separate, independently editable fields on the division form.
 */

import { LevelsApiService } from '@/services/api/levelsApi';
import { ApiLevel } from '@/types/api/entities';
import { formatBandRange } from '@/utils/playerLevel';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

const levelsApi = new LevelsApiService();

type Props = {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
};

export default function DivisionLevelBandsPicker({
  selectedIds,
  onChange,
  disabled = false,
}: Props) {
  const [bands, setBands] = useState<ApiLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    levelsApi
      .getAllLevels()
      .then(levels => {
        if (!cancelled) setBands(levels);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.message || 'Failed to load level bands');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (id: number) => {
    if (disabled) return;
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter(item => item !== id)
        : [...selectedIds, id]
    );
  };

  return (
    <View testID="division-level-bands-picker" className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-1">
        Level bands
      </Text>
      {loading ? (
        <ActivityIndicator testID="division-level-bands-loading" />
      ) : error ? (
        <Text testID="division-level-bands-error" className="text-sm text-red-600">
          {error}
        </Text>
      ) : bands.length === 0 ? (
        <Text className="text-sm text-gray-500">No level bands available.</Text>
      ) : (
        bands.map(band => {
          const checked = selectedIds.includes(band.id_level);
          return (
            <Pressable
              key={band.id_level}
              testID={'division-band-' + band.id_level}
              accessibilityRole="checkbox"
              accessibilityState={{ checked, disabled }}
              disabled={disabled}
              onPress={() => toggle(band.id_level)}
              className="flex-row items-center py-1"
            >
              <View
                className={`w-4 h-4 mr-2 rounded border items-center justify-center ${
                  checked
                    ? 'border-blue-600 bg-blue-600'
                    : 'border-gray-400 bg-white'
                }`}
              >
                {checked ? <Text className="text-white text-xs">✓</Text> : null}
              </View>
              <Text className="text-sm text-gray-800">
                {band.name} ({formatBandRange(band)})
              </Text>
            </Pressable>
          );
        })
      )}
    </View>
  );
}
