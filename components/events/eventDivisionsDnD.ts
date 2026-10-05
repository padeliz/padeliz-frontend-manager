/**
 * Pure helpers for Divisions tab same-ED / cross-ED drag-and-drop.
 */

export type EdListFrame = {
  edId: number;
  /** Top of list in the same coordinate space as absoluteY */
  y: number;
  height: number;
  count: number;
};

export type DropTarget = {
  targetEdId: number;
  index: number;
};

export type DroppableParticipation = {
  id_participation: number;
  event_division_id: number | null;
  sort_order?: number | null;
};

/**
 * Map a drop Y to an ED list + insert index.
 * Empty lists use at least `rowHeight` as a hit area.
 * Index is in [0, count] (count = append).
 */
export function resolveDropTarget(
  frames: EdListFrame[],
  absoluteY: number,
  rowHeight: number
): DropTarget | null {
  if (frames.length === 0) return null;

  const ordered = [...frames].sort((a, b) => a.y - b.y);

  const indexInFrame = (frame: EdListFrame, y: number): number => {
    if (frame.count === 0) return 0;
    const offset = y - frame.y;
    const rawIndex = Math.floor(offset / rowHeight);
    return Math.max(0, Math.min(frame.count, rawIndex));
  };

  for (const frame of ordered) {
    const hitHeight = Math.max(frame.height, rowHeight);
    const top = frame.y;
    const bottom = frame.y + hitHeight;
    if (absoluteY >= top && absoluteY < bottom) {
      return {
        targetEdId: frame.edId,
        index: indexInFrame(frame, absoluteY),
      };
    }
  }

  let best: EdListFrame | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const frame of ordered) {
    const hitHeight = Math.max(frame.height, rowHeight);
    const mid = frame.y + hitHeight / 2;
    const dist = Math.abs(absoluteY - mid);
    if (dist < bestDist) {
      bestDist = dist;
      best = frame;
    }
  }
  if (!best) return null;
  return {
    targetEdId: best.edId,
    index: indexInFrame(best, absoluteY),
  };
}

/**
 * Move/reorder a participation across ED lists; reindexes sort_order on
 * touched lists.
 */
export function applyDrop<T extends DroppableParticipation>(
  items: T[],
  fromEd: number,
  fromIndex: number,
  targetEd: number,
  toIndex: number
): T[] {
  const byEd = new Map<number, T[]>();
  for (const item of items) {
    const ed = item.event_division_id as number;
    if (!byEd.has(ed)) byEd.set(ed, []);
    byEd.get(ed)!.push(item);
  }
  for (const [, list] of byEd) {
    list.sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
        a.id_participation - b.id_participation
    );
  }

  const source = [...(byEd.get(fromEd) || [])];
  if (fromIndex < 0 || fromIndex >= source.length) return items;
  const [moved] = source.splice(fromIndex, 1);

  if (fromEd === targetEd) {
    let insertAt = Math.max(0, Math.min(source.length, toIndex));
    if (toIndex > fromIndex) {
      insertAt = Math.max(0, Math.min(source.length, toIndex - 1));
    }
    source.splice(insertAt, 0, moved);
    byEd.set(fromEd, source);
  } else {
    byEd.set(fromEd, source);
    const target = [...(byEd.get(targetEd) || [])];
    const insertAt = Math.max(0, Math.min(target.length, toIndex));
    target.splice(insertAt, 0, {
      ...moved,
      event_division_id: targetEd,
    });
    byEd.set(targetEd, target);
  }

  const result: T[] = [];
  const seen = new Set<number>();
  for (const [edId, list] of byEd) {
    list.forEach((p, i) => {
      result.push({ ...p, event_division_id: edId, sort_order: i });
      seen.add(p.id_participation);
    });
  }
  for (const item of items) {
    if (!seen.has(item.id_participation)) result.push(item);
  }
  return result;
}
