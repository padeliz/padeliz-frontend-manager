/**
 * Challenge live leaderboard table metrics.
 * Today’s 15-row page: header 37 + 15 × 41 = 652.
 * New 10-row page:     header 52 + 10 × 60 = 652.
 */

export const LEADERBOARD_PAGE_SIZE = 10;
export const LEADERBOARD_HEADER_HEIGHT = 52;
export const LEADERBOARD_ROW_HEIGHT = 60;

export const LEADERBOARD_HEADER_FONT_SIZE = 20;
export const LEADERBOARD_HEADER_LINE_HEIGHT = 28;
export const LEADERBOARD_BODY_FONT_SIZE = 30;
export const LEADERBOARD_BODY_LINE_HEIGHT = 36;

export const LEADERBOARD_HEADER_TEXT_STYLE = {
  fontSize: LEADERBOARD_HEADER_FONT_SIZE,
  lineHeight: LEADERBOARD_HEADER_LINE_HEIGHT,
} as const;

export const LEADERBOARD_BODY_TEXT_STYLE = {
  fontSize: LEADERBOARD_BODY_FONT_SIZE,
  lineHeight: LEADERBOARD_BODY_LINE_HEIGHT,
} as const;
