/**
 * Shared drag-and-drop row primitive for edition lists (participations,
 * divisions, matches board). Drag distance is quantised by row height, so every
 * list that uses it must render rows of `rowHeight`.
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export const SORTABLE_ROW_HEIGHT = 48;

/**
 * Target index for a same-list drag, clamped to the list bounds.
 */
export function sameListDropIndex(
  index: number,
  count: number,
  translationY: number,
  rowHeight: number
): number {
  const delta = Math.round(translationY / rowHeight);
  return Math.max(0, Math.min(count - 1, index + delta));
}

/**
 * Move an item one slot up (-1) or down (1). Returns null when out of bounds.
 */
export function moveInList<T>(list: T[], index: number, dir: -1 | 1): T[] | null {
  const j = index + dir;
  if (index < 0 || index >= list.length || j < 0 || j >= list.length) {
    return null;
  }
  const next = [...list];
  const tmp = next[index];
  next[index] = next[j];
  next[j] = tmp;
  return next;
}

/**
 * Move an item from one index to another. Returns null when nothing changes.
 */
export function reorderList<T>(list: T[], from: number, to: number): T[] | null {
  if (from === to) return null;
  if (from < 0 || from >= list.length || to < 0 || to >= list.length) {
    return null;
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

type SortableRowProps = {
  index: number;
  count: number;
  locked: boolean;
  rowHeight?: number;
  /** Same-list move. Ignored when `onDragEnd` is provided. */
  onReorder?: (from: number, to: number) => void;
  /**
   * Takes over drop handling with the raw gesture offset, for lists that need
   * cross-list targets or extra rules.
   */
  onDragEnd?: (translationY: number) => void;
  testID?: string;
  children: React.ReactNode;
};

export default function SortableRow({
  index,
  count,
  locked,
  rowHeight = SORTABLE_ROW_HEIGHT,
  onReorder,
  onDragEnd,
  testID,
  children,
}: SortableRowProps) {
  const translateY = useSharedValue(0);
  const zIndex = useSharedValue(0);
  const dragging = useSharedValue(0);

  const finishDrop = (translationY: number) => {
    if (onDragEnd) {
      onDragEnd(translationY);
      return;
    }
    const next = sameListDropIndex(index, count, translationY, rowHeight);
    if (next !== index) onReorder?.(index, next);
  };

  const gesture = Gesture.Pan()
    .enabled(!locked)
    .activeOffsetY([-8, 8])
    .onStart(() => {
      zIndex.value = 20;
      dragging.value = 1;
    })
    .onUpdate(e => {
      translateY.value = e.translationY;
    })
    .onEnd(e => {
      const ty = e.translationY;
      translateY.value = withSpring(0);
      zIndex.value = 0;
      dragging.value = 0;
      runOnJS(finishDrop)(ty);
    })
    .onFinalize(() => {
      translateY.value = withSpring(0);
      zIndex.value = 0;
      dragging.value = 0;
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    zIndex: zIndex.value,
    elevation: zIndex.value,
    opacity: dragging.value ? 0.92 : 1,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View testID={testID} style={[{ minHeight: rowHeight }, style]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

export function SortableDragHandle({ testID }: { testID?: string }) {
  return (
    <View className="mr-2 p-1" testID={testID}>
      <Ionicons name="menu" size={18} color="#9ca3af" />
    </View>
  );
}

export function SortableArrows({
  onUp,
  onDown,
  upTestID,
  downTestID,
}: {
  onUp: () => void;
  onDown: () => void;
  upTestID?: string;
  downTestID?: string;
}) {
  return (
    <>
      <Pressable onPress={onUp} className="p-2" testID={upTestID}>
        <Ionicons name="arrow-up" size={18} color="#4b5563" />
      </Pressable>
      <Pressable onPress={onDown} className="p-2" testID={downTestID}>
        <Ionicons name="arrow-down" size={18} color="#4b5563" />
      </Pressable>
    </>
  );
}