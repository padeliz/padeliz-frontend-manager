import Tooltip from '@/components/ui/Tooltip';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

export type LotteryEmptyKind = 'none' | 'select';

export default function LotteryEmptyState({
  kind = 'select',
}: {
  kind?: LotteryEmptyKind;
}) {
  if (kind === 'none') {
    return (
      <Text testID="lottery-none-empty" className="text-sm text-gray-500">
        No lotteries for this edition.
      </Text>
    );
  }
  return (
    <Text testID="lottery-select-empty" className="text-sm text-gray-500">
      Select a lottery to view prizes, rules, and luckies.
    </Text>
  );
}

export function LotteryFinalizedHint({
  mode,
}: {
  mode: 'prizes' | 'rules' | 'luckies';
}) {
  const copy =
    mode === 'luckies'
      ? 'Edition is finalized — Accept / Reject are read-only.'
      : 'Edition is finalized — prize lines and rules are read-only.';
  return (
    <Text
      testID="lottery-finalized-hint"
      className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2"
    >
      {copy}
    </Text>
  );
}

export function mismatchWarningContent(
  prizeQuantity: number,
  ruleQuantityTotal: number
): string {
  return `Prize quantity (${prizeQuantity}) does not match total rule quantity (${ruleQuantityTotal}).`;
}

export function MismatchWarning({
  testID,
  prizeQuantity,
  ruleQuantityTotal,
}: {
  testID?: string;
  prizeQuantity: number;
  ruleQuantityTotal: number;
}) {
  const content = mismatchWarningContent(prizeQuantity, ruleQuantityTotal);
  return (
    <Tooltip content={content} testID={testID ?? 'lottery-mismatch-warning'}>
      <View className="mr-1">
        <Ionicons
          name="warning"
          size={18}
          color="#dc2626"
          accessibilityLabel={content}
        />
      </View>
    </Tooltip>
  );
}

export function DivisionChip({
  label,
  color,
  testID,
}: {
  label: string;
  color?: string | null;
  testID?: string;
}) {
  const bg = color && /^#?[0-9a-fA-F]{3,8}$/.test(color) ? color : '#e5e7eb';
  const normalized = bg.startsWith('#') ? bg : `#${bg}`;
  return (
    <View
      testID={testID}
      className="px-2 py-1 rounded-md mr-2"
      style={{ backgroundColor: normalized }}
    >
      <Text className="text-xs font-medium text-gray-900">{label}</Text>
    </View>
  );
}
