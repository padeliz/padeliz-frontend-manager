/**
 * Footer section for the division view page: edits the M2M level bands and
 * saves them on their own. Only `level_ids` is sent, so the API leaves the
 * division's `level_min` / `level_max` exactly as they are (the client never
 * derives or rewrites bounds from the selected bands).
 */

import DivisionLevelBandsPicker from '@/components/divisions/DivisionLevelBandsPicker';
import ActionButton from '@/components/ui/ActionButton';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { DivisionsApiService } from '@/services/api/divisionsApi';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

const api = new DivisionsApiService();

type Props = {
  divisionId: number;
};

export default function DivisionLevelBandsSection({ divisionId }: Props) {
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [ids, setIds] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const saveStatus = useActionButtonStatus({ auditoryFeedback: true });

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await api.getDivision(divisionId);
      const current = (res.data.levels ?? []).map(l => l.id_level);
      setSavedIds(current);
      setIds(current);
      setLoaded(true);
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load division bands');
    }
  }, [divisionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(
    () =>
      [...ids].sort((a, b) => a - b).join(',') !==
      [...savedIds].sort((a, b) => a - b).join(','),
    [ids, savedIds]
  );

  const save = async () => {
    const res = await api.syncDivisionLevels(divisionId, ids);
    const next = (res.data.levels ?? []).map(l => l.id_level);
    setSavedIds(next);
    setIds(next);
  };

  return (
    <View
      testID="division-level-bands-section"
      className="bg-white border rounded-lg p-4 mt-4"
    >
      {loadError ? (
        <Text testID="division-level-bands-load-error" className="text-sm text-red-600">
          {loadError}
        </Text>
      ) : !loaded ? null : (
        <>
          <DivisionLevelBandsPicker selectedIds={ids} onChange={setIds} />
          <Text className="text-xs text-gray-500 mb-2">
            Changing bands does not change level min / max above.
          </Text>
          <View className="self-start">
            <ActionButton
              testID="division-level-bands-save"
              label="Save bands"
              variant="primary"
              size="sm"
              disabled={!dirty}
              disabledReason="No band changes to save."
              status={saveStatus.status}
              errorMessage={saveStatus.errorMessage ?? undefined}
              onPress={() => void saveStatus.run(save)}
            />
          </View>
        </>
      )}
    </View>
  );
}
