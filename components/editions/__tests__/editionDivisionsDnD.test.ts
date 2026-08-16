import {
  applyDrop,
  resolveDropTarget,
} from '@/components/editions/editionDivisionsDnD';

describe('resolveDropTarget', () => {
  const frames = [
    { edId: 1, y: 0, height: 96, count: 2 },
    { edId: 2, y: 200, height: 48, count: 1 },
    { edId: 3, y: 300, height: 20, count: 0 },
  ];
  const rowHeight = 48;

  it('resolves same-ED index from Y inside source list', () => {
    expect(resolveDropTarget(frames, 24, rowHeight)).toEqual({
      targetEdId: 1,
      index: 0,
    });
    expect(resolveDropTarget(frames, 60, rowHeight)).toEqual({
      targetEdId: 1,
      index: 1,
    });
  });

  it('resolves cross-ED target including empty list as index 0', () => {
    expect(resolveDropTarget(frames, 220, rowHeight)).toEqual({
      targetEdId: 2,
      index: 0,
    });
    expect(resolveDropTarget(frames, 310, rowHeight)).toEqual({
      targetEdId: 3,
      index: 0,
    });
  });

  it('returns null for empty frames', () => {
    expect(resolveDropTarget([], 10, rowHeight)).toBeNull();
  });
});

describe('applyDrop', () => {
  const items = [
    {
      id_participation: 1,
      edition_division_id: 10,
      sort_order: 0,
    },
    {
      id_participation: 2,
      edition_division_id: 10,
      sort_order: 1,
    },
    {
      id_participation: 3,
      edition_division_id: 20,
      sort_order: 0,
    },
  ];

  it('reorders within the same ED and reindexes sort_order', () => {
    const next = applyDrop(items, 10, 0, 10, 2);
    const ed10 = next
      .filter(p => p.edition_division_id === 10)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    expect(ed10.map(p => p.id_participation)).toEqual([2, 1]);
    expect(ed10.map(p => p.sort_order)).toEqual([0, 1]);
  });

  it('moves participation across EDs and updates edition_division_id + sort_order', () => {
    const next = applyDrop(items, 10, 1, 20, 0);
    const moved = next.find(p => p.id_participation === 2)!;
    expect(moved.edition_division_id).toBe(20);
    expect(moved.sort_order).toBe(0);
    const ed10 = next
      .filter(p => p.edition_division_id === 10)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const ed20 = next
      .filter(p => p.edition_division_id === 20)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    expect(ed10.map(p => p.id_participation)).toEqual([1]);
    expect(ed10[0].sort_order).toBe(0);
    expect(ed20.map(p => p.id_participation)).toEqual([2, 3]);
    expect(ed20.map(p => p.sort_order)).toEqual([0, 1]);
  });
});
