/**
 * Optional resource-screen Sub Header (title/description left, actions right).
 * Unused on routes this pass; Page Header owns everything.
 */

import React from 'react';
import { Text, View } from 'react-native';

export type ResourceSubHeaderProps = {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  testID?: string;
};

export default function ResourceSubHeader({
  title,
  description,
  actions,
  testID = 'resource-sub-header',
}: ResourceSubHeaderProps) {
  if (!title && !description && !actions) return null;

  return (
    <View
      className="px-4 py-3 border-b border-gray-200 bg-white flex-row flex-wrap items-center justify-between gap-2"
      testID={testID}
    >
      <View className="flex-1 min-w-[140px]">
        {title ? (
          <Text className="text-lg font-semibold text-gray-900">{title}</Text>
        ) : null}
        {description ? (
          <Text className="text-sm text-gray-600 mt-0.5">{description}</Text>
        ) : null}
      </View>
      {actions ? (
        <View className="flex-row flex-wrap items-center gap-2">{actions}</View>
      ) : null}
    </View>
  );
}
