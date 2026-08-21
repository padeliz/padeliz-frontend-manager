import { ApiEditionDivision } from '@/types/api/entities';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import { sortBySkillOrder } from '@/utils/edition/editionDivisionOrder';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

type Props = {
  divisions: ApiEditionDivision[];
  value: number | null;
  onChange: (id: number | null) => void;
  includeGeneral?: boolean;
};

export default function EditionDivisionPicker({
  divisions,
  value,
  onChange,
  includeGeneral = false,
}: Props) {
  const options = useMemo(() => {
    const eds = sortBySkillOrder(divisions).map(ed => ({
      label:
        ed.division_title ||
        ed.division?.name ||
        `ED #${ed.id_edition_division}`,
      value: Number(ed.id_edition_division),
    }));
    if (includeGeneral) {
      return [{ label: 'General', value: 0 }, ...eds];
    }
    return eds;
  }, [divisions, includeGeneral]);

  const selectedValue = useMemo(() => {
    if (value == null) {
      return includeGeneral ? 0 : null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }, [includeGeneral, value]);

  if (divisions.length === 0 && !includeGeneral) {
    return (
      <View className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <Text className="text-sm text-amber-800">
          No edition divisions available for this edition.
        </Text>
      </View>
    );
  }

  return (
    <View className="mb-0" testID="edition-division-picker">
      <SingleSelectDropdown
        options={options}
        selectedValue={selectedValue}
        onSelectionChange={v => {
          const n = Number(v);
          onChange(n === 0 || !Number.isFinite(n) ? null : n);
        }}
        placeholder="Select edition division"
        title="Edition division"
        minWidth={220}
      />
    </View>
  );
}
