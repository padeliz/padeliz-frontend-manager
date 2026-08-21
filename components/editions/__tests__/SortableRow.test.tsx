import {
  moveInList,
  reorderList,
  sameListDropIndex,
  SORTABLE_ROW_HEIGHT,
} from '@/components/editions/SortableRow';

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
