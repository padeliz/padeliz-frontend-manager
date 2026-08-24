/**
 * Single vertical page-body scroller owned by AppLayout.
 * Route content should be Views only — no nested vertical ScrollViews.
 *
 * Allowed scrollers elsewhere: sidebar nav, EditionTabsBar horizontal,
 * AdvancedDataTable horizontal, dropdown overlays.
 */

import React from 'react';
import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

type Props = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  testID?: string;
};

export default function AppContentScroll({
  children,
  className = 'flex-1 min-h-0',
  contentClassName = 'p-6',
  testID = 'app-content-scroll',
}: Props) {
  return (
    <ScrollView className={className} testID={testID}>
      <View className={contentClassName}>{children}</View>
    </ScrollView>
  );
}
