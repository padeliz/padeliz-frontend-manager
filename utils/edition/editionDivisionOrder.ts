/**
 * Edition divisions are presented weakest-to-strongest by skill_order.
 */

import { ApiEditionDivision } from '@/types/api/entities';

export function sortBySkillOrder<
  T extends { skill_order?: number | null; id_edition_division: number },
>(divisions: T[]): T[] {
  return [...divisions].sort(
    (a, b) =>
      (a.skill_order ?? 0) - (b.skill_order ?? 0) ||
      a.id_edition_division - b.id_edition_division
  );
}

export function nextSkillOrder(divisions: ApiEditionDivision[]): number {
  return divisions.reduce(
    (max, d) => Math.max(max, (d.skill_order ?? 0) + 1),
    0
  );
}
