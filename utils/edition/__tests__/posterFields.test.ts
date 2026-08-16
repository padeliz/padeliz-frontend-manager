import { PosterRow } from '@/types/api/edition';

/** Normalize poster row for upload UI — ensures correct PK field. */
export function posterUploadId(poster: PosterRow): number {
  return poster.id_edition_division_poster;
}

describe('posterUploadId', () => {
  it('uses id_edition_division_poster not legacy id_poster', () => {
    const row: PosterRow = {
      id_edition_division_poster: 42,
      poster_kind: 'MATCHES',
      edition_division_court_id: 7,
    };
    expect(posterUploadId(row)).toBe(42);
    expect((row as any).id_poster).toBeUndefined();
  });
});
