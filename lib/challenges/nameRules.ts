/** Session-scoped name normalize + uniqueness (grapheme-aware lengths). */

const LIGATURES: Record<string, string> = {
  æ: 'ae',
  œ: 'oe',
  ß: 'ss',
};

export function normalizeChallengeName(name: string): string {
  let s = name.trim().toLowerCase();
  for (const [from, to] of Object.entries(LIGATURES)) {
    s = s.split(from).join(to);
  }
  s = s.normalize('NFD').replace(/\p{M}/gu, '');
  s = s.replace(/[^\p{L}\p{N}\s]/gu, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

export function graphemeLength(value: string): number {
  return [...value.trim()].length;
}

export const TEAM_NAME_MIN = 10;
export const TEAM_NAME_MAX = 35;
export const PLAYER_NAME_MIN = 5;
export const PLAYER_NAME_MAX = 20;
export const SESSION_TITLE_MIN = 20;
export const SESSION_TITLE_MAX = 50;
export const SESSION_BOTTOM_TEXT_MIN = 20;
export const SESSION_BOTTOM_TEXT_MAX = 45;
export const WAITING_MAX = 6;

export function validateTeamName(name: string): string | null {
  const len = graphemeLength(name);
  if (len < TEAM_NAME_MIN || len > TEAM_NAME_MAX) {
    return `Team name must be ${TEAM_NAME_MIN}–${TEAM_NAME_MAX} characters.`;
  }
  return null;
}

export function validatePlayerName(name: string): string | null {
  const len = graphemeLength(name);
  if (len < PLAYER_NAME_MIN || len > PLAYER_NAME_MAX) {
    return `Player name must be ${PLAYER_NAME_MIN}–${PLAYER_NAME_MAX} characters.`;
  }
  return null;
}

export function validateSessionTitle(title: string): string | null {
  const len = graphemeLength(title);
  if (len < SESSION_TITLE_MIN || len > SESSION_TITLE_MAX) {
    return `Title must be ${SESSION_TITLE_MIN}–${SESSION_TITLE_MAX} characters.`;
  }
  return null;
}

export function validateSessionBottomText(bottomText: string): string | null {
  const len = graphemeLength(bottomText);
  if (len < SESSION_BOTTOM_TEXT_MIN || len > SESSION_BOTTOM_TEXT_MAX) {
    return `Bottom text must be ${SESSION_BOTTOM_TEXT_MIN}–${SESSION_BOTTOM_TEXT_MAX} characters.`;
  }
  return null;
}

export function isNameTaken(
  normalized: string,
  existingNormalized: string[]
): boolean {
  return existingNormalized.includes(normalized);
}
