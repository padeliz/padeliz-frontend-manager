import {
  allowedStrings,
  buildRacketExperienceValue,
  emptyRacketExperienceEntry,
  formatJsonFieldValue,
  formatRacketExperience,
  isRacketExperienceField,
  parseJsonDraft,
  racketExperienceToDraft,
} from '@/utils/customFieldJson';

const racketField = { code: 'racket_experience', type: 'json' } as any;
const otherJson = { code: 'extra', type: 'json' } as any;

describe('customFieldJson', () => {
  it('detects the racket_experience json field only', () => {
    expect(isRacketExperienceField(racketField)).toBe(true);
    expect(isRacketExperienceField(otherJson)).toBe(false);
    expect(
      isRacketExperienceField({ code: 'racket_experience', type: 'text' } as any)
    ).toBe(false);
  });

  it('displays racket experience as readable lines', () => {
    const value = [
      { sport: 'Padel', level: 'Beginner', years_of_playing: 2, matches_played: 10 },
      { sport: 'Tennis', level: 'Advanced', lessons_had: 5 },
    ];
    expect(formatRacketExperience(value)).toEqual([
      'Padel · Beginner · 2 years · 10 matches',
      'Tennis · Advanced · 5 lessons',
    ]);
    expect(formatJsonFieldValue(racketField, value)).toBe(
      'Padel · Beginner · 2 years · 10 matches\nTennis · Advanced · 5 lessons'
    );
  });

  it('displays other json as compact JSON and empties as a dash', () => {
    expect(formatJsonFieldValue(otherJson, { a: 1 })).toBe('{"a":1}');
    expect(formatJsonFieldValue(otherJson, null)).toBe('—');
    expect(formatJsonFieldValue(racketField, [])).toBe('[]');
  });

  it('builds a racket experience value from the editor draft', () => {
    const result = buildRacketExperienceValue([
      {
        ...emptyRacketExperienceEntry(),
        sport: 'Padel',
        level: 'Beginner',
        years_of_playing: '2.5',
        matches_played: '10',
      },
    ]);
    expect(result).toEqual({
      ok: true,
      value: [
        { sport: 'Padel', level: 'Beginner', years_of_playing: 2.5, matches_played: 10 },
      ],
    });
  });

  it('rejects incomplete, duplicate and negative racket entries', () => {
    const base = { ...emptyRacketExperienceEntry(), sport: 'Padel', level: 'Pro' };
    expect(buildRacketExperienceValue([])).toMatchObject({ ok: false });
    expect(
      buildRacketExperienceValue([{ ...base, sport: '' }])
    ).toMatchObject({ ok: false, error: expect.stringMatching(/sport/) });
    expect(
      buildRacketExperienceValue([{ ...base, level: '' }])
    ).toMatchObject({ ok: false, error: expect.stringMatching(/level/) });
    expect(buildRacketExperienceValue([base])).toMatchObject({
      ok: false,
      error: expect.stringMatching(/years of playing/),
    });
    expect(
      buildRacketExperienceValue([{ ...base, matches_played: '-1' }])
    ).toMatchObject({ ok: false, error: expect.stringMatching(/≥ 0/) });
    const dup = { ...base, matches_played: '3' };
    expect(buildRacketExperienceValue([dup, dup])).toMatchObject({
      ok: false,
      error: expect.stringMatching(/only be reported once/),
    });
  });

  it('round-trips a stored value into editor drafts', () => {
    expect(
      racketExperienceToDraft([
        { sport: 'Padel', level: 'Pro', years_of_playing: 3 },
      ])
    ).toEqual([
      {
        sport: 'Padel',
        level: 'Pro',
        years_of_playing: '3',
        matches_played: '',
        lessons_had: '',
      },
    ]);
  });

  it('parses generic json drafts', () => {
    expect(parseJsonDraft('{"a":1}')).toEqual({ ok: true, value: { a: 1 } });
    expect(parseJsonDraft('[1,2]')).toEqual({ ok: true, value: [1, 2] });
    expect(parseJsonDraft('')).toMatchObject({ ok: false });
    expect(parseJsonDraft('{oops')).toMatchObject({ ok: false });
    expect(parseJsonDraft('42')).toMatchObject({ ok: false });
  });

  it('reads allowed sports/levels from rules_json', () => {
    expect(allowedStrings({ sports: ['Padel', 'Tennis'] }, 'sports')).toEqual([
      'Padel',
      'Tennis',
    ]);
    expect(allowedStrings(null, 'levels')).toEqual([]);
  });
});
