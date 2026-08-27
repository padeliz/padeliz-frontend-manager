import SortableRow, {
  moveInList,
  reorderList,
  sameListDropIndex,
  SortableDragHandle,
  SORTABLE_ROW_HEIGHT,
} from '@/components/editions/SortableRow';
import { render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

describe('SortableRow helpers', () => {
  it('quantises drag distance by row height and clamps to the list', () => {
    expect(sameListDropIndex(0, 3, 0, SORTABLE_ROW_HEIGHT)).toBe(0);
    expect(sameListDropIndex(0, 3, SORTABLE_ROW_HEIGHT, SORTABLE_ROW_HEIGHT)).toBe(1);
    expect(
      sameListDropIndex(0, 3, SORTABLE_ROW_HEIGHT * 9, SORTABLE_ROW_HEIGHT)
    ).toBe(2);
    expect(
      sameListDropIndex(2, 3, -SORTABLE_ROW_HEIGHT * 9, SORTABLE_ROW_HEIGHT)
    ).toBe(0);
    expect(sameListDropIndex(1, 3, 20, 72)).toBe(1);
  });

  it('swaps neighbours and refuses out-of-bounds moves', () => {
    expect(moveInList([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    expect(moveInList([1, 2, 3], 2, 1)).toBeNull();
    expect(moveInList([1, 2, 3], 0, -1)).toBeNull();
  });

  it('moves an item to an arbitrary index', () => {
    expect(reorderList([1, 2, 3, 4], 0, 2)).toEqual([2, 3, 1, 4]);
    expect(reorderList([1, 2, 3], 1, 1)).toBeNull();
    expect(reorderList([1, 2, 3], 1, 5)).toBeNull();
  });
});

describe('SortableRow activationMode', () => {
  it('defaults to row mode and still renders children', () => {
    const { getByText } = render(
      <SortableRow index={0} count={1} locked={false}>
        <Text>row-default</Text>
      </SortableRow>
    );
    expect(getByText('row-default')).toBeTruthy();
  });

  it('handle mode exposes SortableDragHandle without breaking render', () => {
    const { getByTestId, getByText } = render(
      <SortableRow
        index={0}
        count={2}
        locked={false}
        activationMode="handle"
        rowHeight={72}
      >
        <SortableDragHandle testID="drag-handle" />
        <Text>handle-mode</Text>
      </SortableRow>
    );
    expect(getByTestId('drag-handle')).toBeTruthy();
    expect(getByTestId('drag-handle').props.className).toMatch(
      /cursor-pointer/
    );
    expect(getByText('handle-mode')).toBeTruthy();
  });
});
